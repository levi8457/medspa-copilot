/**
 * 音频处理 Worker
 * 处理录音解析流水线: ASR → 标签提取 → 策略生成
 */

import { prisma } from "@/lib/db"
import { createASRProvider, formatTranscriptWithSpeakers, MEDSPA_HOTWORDS } from "@/lib/asr"
import { extractTags } from "@/lib/ai/extract-tags"
import { generateStrategy } from "@/lib/ai/generate-strategy"
import { getSignedUrl } from "@/lib/oss"

interface AudioProcessingJob {
  recordingId: string
  orgId: string
  customerId: string
  consultantId: string
  ossUrl: string
}

/**
 * 处理单个音频任务
 */
export async function processAudioJob(job: AudioProcessingJob): Promise<void> {
  const { recordingId, ossUrl } = job

  try {
    const recording = await prisma.audioRecord.findFirst({
      where: {
        id: recordingId,
        orgId: job.orgId,
        customerId: job.customerId,
        consultantId: job.consultantId,
      },
      include: { customer: { select: { notes: true } } },
    })
    if (!recording) {
      throw new Error("录音任务与机构或客户信息不匹配")
    }

    // 1. 更新状态为转写中
    await prisma.audioRecord.update({
      where: { id: recordingId },
      data: { status: "transcribing" },
    })

    // 2. ASR 转写
    const asrProvider = createASRProvider()
    const asrUrl = await getSignedUrl(ossUrl, 4 * 60 * 60)
    const asrResult = await asrProvider.transcribe(asrUrl, {
      enableSpeakerDiarization: true,
      hotwords: MEDSPA_HOTWORDS,
    })

    // 3. 更新转写结果
    const transcriptWithSpeakers = formatTranscriptWithSpeakers(asrResult.speakerDiarization)
    await prisma.audioRecord.update({
      where: { id: recordingId },
      data: {
        transcript: asrResult.transcript,
        speakerDiary: JSON.stringify(asrResult.speakerDiarization),
        duration: asrResult.duration,
        status: "analyzing",
      },
    })

    // 4. AI 标签提取
    const tagResult = await extractTags({
      transcriptWithSpeakers,
    })

    // 5. 保存标签到数据库
    await saveExtractedTags(recordingId, job.orgId, job.customerId, transcriptWithSpeakers, tagResult)

    // 6. Generate tasks once for this recording. Queue retries reuse the same plan.
    await createFollowUpPlan(recordingId, job, recording.customer.notes, tagResult)

    // 7. 更新状态为完成
    await prisma.audioRecord.update({
      where: { id: recordingId },
      data: {
        status: "done",
        analyzedAt: new Date(),
      },
    })

    console.log(`[AudioProcessor] 录音 ${recordingId} 处理完成`)
  } catch (error) {
    console.error(`[AudioProcessor] 录音 ${recordingId} 处理失败:`, error)

    // 更新状态为失败
    await prisma.audioRecord.updateMany({
      where: { id: recordingId, orgId: job.orgId },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "处理失败",
      },
    })

    // BullMQ must receive the failure to apply the configured retry/backoff policy.
    throw error
  }
}

async function createFollowUpPlan(
  recordingId: string,
  job: AudioProcessingJob,
  consultantNotes: string | null,
  tagResult: Awaited<ReturnType<typeof extractTags>>
): Promise<void> {
  const existingPlan = await prisma.followUpPlan.findUnique({
    where: { sourceAudioRecordId: recordingId },
    select: { id: true },
  })
  if (existingPlan) {
    return
  }

  const customerTags: Record<string, string[]> = {}
  const addTag = (dimension: string, value: string | null) => {
    if (!value) return
    customerTags[dimension] ??= []
    customerTags[dimension].push(value)
  }

  addTag("年龄段", tagResult.basic_info.age_range)
  addTag("性别", tagResult.basic_info.gender)
  addTag("职业", tagResult.basic_info.occupation)
  addTag("预算区间", tagResult.spending_power.budget_range)
  addTag("价格敏感度", tagResult.spending_power.price_sensitivity)
  addTag("决策风格", tagResult.personality.decision_style)
  addTag("客户阶段", tagResult.repurchase_potential.lifecycle_stage)
  for (const intent of tagResult.demand_intent) {
    addTag("需求意向", `${intent.project}(${intent.urgency})`)
  }
  for (const concern of tagResult.concerns) {
    addTag("顾虑点", `${concern.type}: ${concern.detail}`)
  }

  const strategy = await generateStrategy({ customerTags, consultantNotes: consultantNotes ?? undefined })
  if (!strategy.plan_feasible) {
    await prisma.timelineEvent.create({
      data: {
        orgId: job.orgId,
        customerId: job.customerId,
        type: "note",
        title: "AI 暂无法生成跟进计划",
        content: strategy.infeasible_reason || "录音标签信息不足，请补充客户需求后重试。",
      },
    })
    return
  }

  await prisma.$transaction(async (tx) => {
    const plan = await tx.followUpPlan.create({
      data: {
        orgId: job.orgId,
        customerId: job.customerId,
        sourceAudioRecordId: recordingId,
        title: `${strategy.primary_project}跟进策略`,
        description: strategy.strategy_summary,
        strategy: JSON.stringify(strategy),
        status: "active",
      },
    })

    await tx.followUpTask.createMany({
      data: strategy.follow_ups.map((followUp) => ({
        orgId: job.orgId,
        planId: plan.id,
        customerId: job.customerId,
        consultantId: job.consultantId,
        scheduledDate: new Date(followUp.scheduled_date),
        priority: followUp.day_offset,
        goal: followUp.objective,
        script: JSON.stringify({
          direction: followUp.script_direction,
          hook: followUp.hook,
          tone: followUp.tone,
        }),
        status: "pending",
      })),
    })
  })
}

/**
 * 保存提取的标签到数据库
 */
async function saveExtractedTags(
  recordingId: string,
  orgId: string,
  customerId: string,
  transcriptWithSpeakers: string,
  tagResult: {
    summary: string
    basic_info: {
      age_range: string | null
      gender: string | null
      occupation: string | null
      location: string | null
      evidences: Array<{
        field: string
        evidence: string
        speaker: string
        confidence: string
      }>
    }
    spending_power: {
      budget_range: string | null
      price_sensitivity: string | null
      payment_signal: string | null
      evidences: Array<{
        field: string
        evidence: string
        speaker: string
        confidence: string
      }>
    }
    demand_intent: Array<{
      project: string
      urgency: string
      decision_stage: string
      evidence: string
      speaker: string
      confidence: string
    }>
    concerns: Array<{
      type: string
      detail: string
      evidence: string
      speaker: string
      confidence: string
    }>
    personality: {
      decision_style: string | null
      communication_preference: string | null
      evidences: Array<{
        field: string
        evidence: string
        speaker: string
        confidence: string
      }>
    }
    repurchase_potential: {
      lifecycle_stage: string | null
      related_projects: Array<{
        project: string
        reason: string
      }>
    }
  }
): Promise<void> {
  const tagsToSave: Array<{
    customerId: string
    orgId: string
    dimension: string
    value: string
    confidence: number
    sourceText: string
    audioRecordId: string
  }> = []

  // 基础信息标签
  if (tagResult.basic_info.age_range) {
    tagsToSave.push({
      customerId,
      orgId,
      dimension: "年龄段",
      value: tagResult.basic_info.age_range,
      confidence: 0.9,
      sourceText: tagResult.basic_info.evidences.find(e => e.field === "age_range")?.evidence || "",
      audioRecordId: recordingId,
    })
  }

  if (tagResult.basic_info.gender) {
    tagsToSave.push({
      customerId,
      orgId,
      dimension: "性别",
      value: tagResult.basic_info.gender === "female" ? "女" : "男",
      confidence: 0.95,
      sourceText: "",
      audioRecordId: recordingId,
    })
  }

  if (tagResult.basic_info.occupation) {
    tagsToSave.push({
      customerId,
      orgId,
      dimension: "职业",
      value: tagResult.basic_info.occupation,
      confidence: 0.8,
      sourceText: tagResult.basic_info.evidences.find(e => e.field === "occupation")?.evidence || "",
      audioRecordId: recordingId,
    })
  }

  // 消费能力标签
  if (tagResult.spending_power.budget_range) {
    tagsToSave.push({
      customerId,
      orgId,
      dimension: "预算区间",
      value: tagResult.spending_power.budget_range,
      confidence: 0.85,
      sourceText: tagResult.spending_power.evidences.find(e => e.field === "budget_range")?.evidence || "",
      audioRecordId: recordingId,
    })
  }

  if (tagResult.spending_power.price_sensitivity) {
    const sensitivityMap: Record<string, string> = {
      high: "价格敏感",
      medium: "价格中等",
      low: "价格不敏感",
    }
    tagsToSave.push({
      customerId,
      orgId,
      dimension: "价格敏感度",
      value: sensitivityMap[tagResult.spending_power.price_sensitivity] || tagResult.spending_power.price_sensitivity,
      confidence: 0.85,
      sourceText: "",
      audioRecordId: recordingId,
    })
  }

  // 需求意向标签
  for (const intent of tagResult.demand_intent) {
    tagsToSave.push({
      customerId,
      orgId,
      dimension: "需求意向",
      value: `${intent.project}(${intent.urgency === "high" ? "高意向" : intent.urgency === "medium" ? "中意向" : "低意向"})`,
      confidence: intent.confidence === "high" ? 0.9 : intent.confidence === "medium" ? 0.7 : 0.5,
      sourceText: intent.evidence,
      audioRecordId: recordingId,
    })
  }

  // 顾虑点标签
  for (const concern of tagResult.concerns) {
    tagsToSave.push({
      customerId,
      orgId,
      dimension: "顾虑点",
      value: `${concern.type}: ${concern.detail}`,
      confidence: concern.confidence === "high" ? 0.9 : concern.confidence === "medium" ? 0.7 : 0.5,
      sourceText: concern.evidence,
      audioRecordId: recordingId,
    })
  }

  // 性格画像标签
  if (tagResult.personality.decision_style) {
    const styleMap: Record<string, string> = {
      decisive: "果断型",
      hesitant: "犹豫型",
      "research-driven": "研究型",
      follower: "跟随型",
    }
    tagsToSave.push({
      customerId,
      orgId,
      dimension: "决策风格",
      value: styleMap[tagResult.personality.decision_style] || tagResult.personality.decision_style,
      confidence: 0.8,
      sourceText: "",
      audioRecordId: recordingId,
    })
  }

  // 复购潜力标签
  if (tagResult.repurchase_potential.lifecycle_stage) {
    const stageMap: Record<string, string> = {
      new: "新客户",
      considering: "考虑中",
      active: "活跃客户",
      dormant: "沉睡客户",
    }
    tagsToSave.push({
      customerId,
      orgId,
      dimension: "客户阶段",
      value: stageMap[tagResult.repurchase_potential.lifecycle_stage] || tagResult.repurchase_potential.lifecycle_stage,
      confidence: 0.85,
      sourceText: "",
      audioRecordId: recordingId,
    })
  }

  // 批量保存标签
  if (tagsToSave.length > 0) {
    await prisma.customerTag.createMany({
      data: tagsToSave.map((tag) => ({
        ...tag,
        sourceOffset: findEvidenceOffset(transcriptWithSpeakers, tag.sourceText),
      })),
      skipDuplicates: true,
    })
  }
}

function findEvidenceOffset(transcript: string, evidence: string): number | null {
  if (!evidence) return null
  const offset = transcript.indexOf(evidence)
  return offset >= 0 ? offset : null
}
