/**
 * 音频处理 Worker
 * 处理录音解析流水线: ASR → 标签提取 → 策略生成
 */

import { Worker } from "bullmq"
import { connection } from "@/lib/queue"
import { prisma } from "@/lib/db"
import { createASRProvider, formatTranscriptWithSpeakers } from "@/lib/asr"
import { extractTags } from "@/lib/ai/extract-tags"

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
    // 1. 更新状态为转写中
    await prisma.audioRecord.update({
      where: { id: recordingId },
      data: { status: "transcribing" },
    })

    // 2. ASR 转写
    const asrProvider = createASRProvider()
    const asrResult = await asrProvider.transcribe(ossUrl, {
      enableSpeakerDiarization: true,
      hotwords: undefined, // 可以从配置中加载
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
    await saveExtractedTags(recordingId, job.orgId, job.customerId, tagResult)

    // 6. 更新状态为完成
    await prisma.audioRecord.update({
      where: { id: recordingId },
      data: {
        status: "done",
        analyzedAt: new Date(),
      },
    })

    // 7. 生成跟进策略（可选）
    // await generateFollowUpStrategy(job.customerId, job.orgId)

    console.log(`[AudioProcessor] 录音 ${recordingId} 处理完成`)
  } catch (error) {
    console.error(`[AudioProcessor] 录音 ${recordingId} 处理失败:`, error)

    // 更新状态为失败
    await prisma.audioRecord.update({
      where: { id: recordingId },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "处理失败",
      },
    })
  }
}

/**
 * 保存提取的标签到数据库
 */
async function saveExtractedTags(
  recordingId: string,
  orgId: string,
  customerId: string,
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
      data: tagsToSave,
    })
  }
}

// BullMQ Worker 启动代码
const worker = new Worker(
  "audio-processing",
  async (job) => {
    console.log(`[Worker] Processing job ${job.id} for recording ${job.data.recordingId}`)
    await processAudioJob(job.data as AudioProcessingJob)
  },
  { connection, concurrency: 2 }
)

worker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} completed`)
})

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err)
})

export { worker }