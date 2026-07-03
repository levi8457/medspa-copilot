import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { validateResourceOwnership } from "@/lib/db-tenant"
import { z } from "zod"
import fs from "node:fs"
import path from "node:path"
import OpenAI from "openai"

// DeepSeek 客户端（兼容 OpenAI SDK）
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
})

// 从 prompts/ 目录加载 Prompt 文件（禁止硬编码 Prompt）
function loadPrompt(filename: string): string {
  return fs.readFileSync(path.join(process.cwd(), "prompts", filename), "utf-8")
}

// 从 health-score.md 中提取 System Prompt 段落
function getSystemPrompt(): string {
  const full = loadPrompt("health-score.md")
  const match = full.match(/## System Prompt([\s\S]*?)## User Prompt/)
  if (!match) {
    throw new Error("health-score.md 格式错误：找不到 System Prompt 段落")
  }
  return match[1].trim()
}

// 健康度评分输出 Schema（6 维度 + 综合分 + 趋势 + 风险/挽回策略）
const HealthScoreSchema = z.object({
  score: z.number().min(0).max(100),
  level: z.enum(["healthy", "good", "warning", "danger"]),
  dimensions: z.object({
    interactionFrequency: z.number().min(0).max(100),
    recency: z.number().min(0).max(100),
    satisfaction: z.number().min(0).max(100),
    consumption: z.number().min(0).max(100),
    repurchase: z.number().min(0).max(100),
    activity: z.number().min(0).max(100),
  }),
  trend: z.enum(["up", "stable", "down"]),
  riskReasons: z.array(z.string()),
  rescueStrategy: z
    .object({
      summary: z.string().min(1),
      actions: z.array(z.string().min(1)),
      priority: z.enum(["high", "medium", "low"]),
      bestChannel: z.enum(["wechat", "phone", "in_store"]),
      timing: z.string().min(1),
    })
    .nullable(),
})

type HealthScoreResult = z.infer<typeof HealthScoreSchema>

const MAX_RETRIES = 2

// GET - 获取客户当前健康度 + 最近 10 条历史评分记录 + 风险原因和挽回策略
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const { id } = await params

    // 验证客户归属权限（consultant 只能查看自己名下客户）
    const hasAccess = await validateResourceOwnership("Customer", id, session)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "无权访问此客户" } },
        { status: 403 }
      )
    }

    // 查询当前客户 healthScore + 最近 10 条评分历史（含风险原因和挽回策略）
    const [customer, history] = await Promise.all([
      prisma.customer.findUnique({
        where: { id },
        select: { healthScore: true },
      }),
      prisma.customerHealthScore.findMany({
        where: { customerId: id, orgId: session.user.orgId },
        orderBy: { evaluatedAt: "desc" },
        take: 10,
      }),
    ])

    // 解析最新一条记录的 JSON 字段，便于前端直接消费
    const latestRaw = history[0] ?? null
    const latest = latestRaw
      ? {
          ...latestRaw,
          dimensions: safeParseJSON(latestRaw.dimensions, null),
          riskReasons: latestRaw.riskReasons
            ? safeParseJSON(latestRaw.riskReasons, [])
            : [],
          rescueStrategy: latestRaw.rescueStrategy
            ? safeParseJSON(latestRaw.rescueStrategy, null)
            : null,
        }
      : null

    // 历史列表只返回轻量字段（用于趋势图）
    const historyLight = history.map((h) => ({
      id: h.id,
      score: h.score,
      level: h.level,
      trend: h.trend,
      evaluatedAt: h.evaluatedAt,
    }))

    return NextResponse.json({
      success: true,
      data: {
        current: customer?.healthScore ?? null,
        latest,
        history: historyLight,
      },
    })
  } catch (error) {
    console.error("获取健康度失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取健康度失败" } },
      { status: 500 }
    )
  }
}

// POST - 重新计算客户健康度
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const { id } = await params

    // 校验客户存在且属于该 orgId（禁止信任前端传入的 orgId，一律从 session 取）
    const customer = await prisma.customer.findFirst({
      where: { id, orgId: session.user.orgId },
      select: {
        id: true,
        consultantId: true,
        name: true,
        phone: true,
        wechat: true,
        age: true,
        gender: true,
        source: true,
        status: true,
        tier: true,
        createdAt: true,
      },
    })

    if (!customer) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "客户不存在" } },
        { status: 404 }
      )
    }

    // consultant 角色额外校验 consultantId 归属（只能操作自己名下客户）
    if (
      session.user.role === "consultant" &&
      customer.consultantId !== session.user.id
    ) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "无权操作此客户" } },
        { status: 403 }
      )
    }

    // 查询最近 30 天的互动记录 + 消费记录 + 满意度调研 + 跟进任务完成情况 + 标签 + 上次评分
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [
      interactions,
      consumptionRecords,
      satisfactionSurveys,
      followUpTasks,
      tags,
      previousScoreRecord,
    ] = await Promise.all([
      // 最近 30 天互动记录（最多 50 条，按时间倒序）
      prisma.customerInteraction.findMany({
        where: {
          customerId: id,
          orgId: session.user.orgId,
          occurredAt: { gte: thirtyDaysAgo },
        },
        orderBy: { occurredAt: "desc" },
        take: 50,
        select: {
          channel: true,
          direction: true,
          duration: true,
          content: true,
          summary: true,
          hasReply: true,
          replyTime: true,
          occurredAt: true,
        },
      }),
      // 最近 30 天消费记录
      prisma.consumptionRecord.findMany({
        where: {
          customerId: id,
          orgId: session.user.orgId,
          consumedAt: { gte: thirtyDaysAgo },
        },
        orderBy: { consumedAt: "desc" },
        select: { amount: true, items: true, notes: true, consumedAt: true },
      }),
      // 最近满意度调研（已完成，取最近 10 条）
      prisma.satisfactionSurvey.findMany({
        where: {
          customerId: id,
          orgId: session.user.orgId,
          status: "completed",
        },
        orderBy: { completedAt: "desc" },
        take: 10,
        select: {
          type: true,
          rating: true,
          dimensions: true,
          feedback: true,
          npsScore: true,
          completedAt: true,
        },
      }),
      // 最近 30 天跟进任务完成情况
      prisma.followUpTask.findMany({
        where: {
          customerId: id,
          orgId: session.user.orgId,
          scheduledDate: { gte: thirtyDaysAgo },
        },
        orderBy: { scheduledDate: "desc" },
        select: {
          scheduledDate: true,
          goal: true,
          status: true,
          skipReason: true,
          executedAt: true,
        },
      }),
      // 客户标签（用于复购意向与生命周期判断）
      prisma.customerTag.findMany({
        where: { customerId: id, orgId: session.user.orgId },
        select: { dimension: true, value: true, confidence: true },
      }),
      // 上一次健康度评分（用于趋势对比）
      prisma.customerHealthScore.findFirst({
        where: { customerId: id, orgId: session.user.orgId },
        orderBy: { evaluatedAt: "desc" },
        select: { score: true, level: true, evaluatedAt: true },
      }),
    ])

    // 组装互动统计摘要
    const repliedInteractions = interactions.filter((i) => i.hasReply)
    const replyTimes = interactions
      .map((i) => i.replyTime)
      .filter((v): v is number => v != null)
    const interactionsSummary = {
      total: interactions.length,
      consultantInitiated: interactions.filter(
        (i) => i.direction === "consultant_initiated"
      ).length,
      customerInitiated: interactions.filter(
        (i) => i.direction === "customer_initiated"
      ).length,
      replied: repliedInteractions.length,
      avgReplyTime:
        replyTimes.length > 0
          ? replyTimes.reduce((sum, t) => sum + t, 0) / replyTimes.length
          : null,
      lastInteractionAt: interactions[0]?.occurredAt ?? null,
      byChannel: groupByChannel(interactions),
    }

    // 组装跟进任务统计
    const tasksSummary = {
      total: followUpTasks.length,
      done: followUpTasks.filter((t) => t.status === "done").length,
      skipped: followUpTasks.filter((t) => t.status === "skipped").length,
      pending: followUpTasks.filter((t) => t.status === "pending").length,
      postponed: followUpTasks.filter((t) => t.status === "postponed").length,
    }

    // 从客户标签中提取复购意向与生命周期信号
    const repurchaseSignals = extractRepurchaseSignals(tags)

    const today = new Date().toISOString().split("T")[0]

    // 组装 User Prompt（严格按 health-score.md 中的模板填充）
    const userPrompt = [
      "请基于以下客户行为数据计算健康度评分，严格输出 JSON。",
      "",
      `【今天日期】 ${today}`,
      "",
      "【客户基础信息】",
      JSON.stringify(customer, null, 2),
      "",
      "【上次健康度评分】（用于趋势对比，可能为 null）",
      previousScoreRecord
        ? JSON.stringify({
            score: previousScoreRecord.score,
            level: previousScoreRecord.level,
            evaluatedAt: previousScoreRecord.evaluatedAt,
          })
        : "null",
      "",
      "【最近 30 天互动记录统计】（JSON）",
      JSON.stringify(interactionsSummary, null, 2),
      "",
      "【最近 30 天互动明细】（JSON 数组，已按时间倒序，最多 50 条）",
      JSON.stringify(interactions, null, 2),
      "",
      "【最近 30 天消费记录】（JSON 数组）",
      JSON.stringify(consumptionRecords, null, 2),
      "",
      "【最近满意度调研】（JSON 数组，可能为空）",
      JSON.stringify(satisfactionSurveys, null, 2),
      "",
      "【最近 30 天跟进任务完成情况】（JSON）",
      JSON.stringify(tasksSummary, null, 2),
      "",
      "【客户标签中的复购意向与生命周期】（JSON，可能为空）",
      JSON.stringify(repurchaseSignals, null, 2),
    ].join("\n")

    // 调用 DeepSeek 生成健康度评分（带 Zod 校验 + 重试，最多 2 次）
    const systemPrompt = getSystemPrompt()
    let lastError = ""
    let scoreResult: HealthScoreResult | null = null

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]

      // 重试时附加上一次的校验错误，让模型自我修正
      if (attempt > 0) {
        messages.push({
          role: "user",
          content: `你上一次的输出未通过格式校验，错误信息：${lastError}\n请修正后重新输出完整 JSON。`,
        })
      }

      const completion = await deepseek.chat.completions.create({
        model: "deepseek-chat",
        messages,
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 4096,
      })

      const raw = completion.choices[0]?.message?.content ?? ""
      const parsed = parseHealthScoreResult(raw)

      if (parsed.success) {
        scoreResult = parsed.data
        break
      }

      lastError = parsed.error
      console.warn(`[health-score] attempt ${attempt + 1} failed: ${lastError}`)
    }

    if (!scoreResult) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "LLM_GENERATION_FAILED",
            message: "健康度评分生成失败，请稍后重试",
          },
        },
        { status: 500 }
      )
    }

    // 计算趋势：与上一次评分对比（up / stable / down，阈值 ±3）
    const trend: "up" | "stable" | "down" = previousScoreRecord
      ? scoreResult.score > previousScoreRecord.score + 3
        ? "up"
        : scoreResult.score < previousScoreRecord.score - 3
          ? "down"
          : "stable"
      : "stable"

    // 存入 CustomerHealthScore 表（JSON 字段序列化为字符串）
    const healthScore = await prisma.customerHealthScore.create({
      data: {
        orgId: session.user.orgId,
        customerId: id,
        score: scoreResult.score,
        level: scoreResult.level,
        dimensions: JSON.stringify(scoreResult.dimensions),
        trend,
        riskReasons:
          scoreResult.riskReasons.length > 0
            ? JSON.stringify(scoreResult.riskReasons)
            : null,
        rescueStrategy: scoreResult.rescueStrategy
          ? JSON.stringify(scoreResult.rescueStrategy)
          : null,
      },
    })

    // 更新 Customer.healthScore 当前值
    await prisma.customer.update({
      where: { id },
      data: { healthScore: scoreResult.score },
    })

    // 返回新评分详情（JSON 字段反序列化为对象，便于前端消费）
    return NextResponse.json({
      success: true,
      data: {
        id: healthScore.id,
        orgId: healthScore.orgId,
        customerId: healthScore.customerId,
        score: healthScore.score,
        level: healthScore.level,
        dimensions: scoreResult.dimensions,
        trend: healthScore.trend,
        riskReasons: scoreResult.riskReasons,
        rescueStrategy: scoreResult.rescueStrategy,
        evaluatedAt: healthScore.evaluatedAt,
        createdAt: healthScore.createdAt,
      },
    })
  } catch (error) {
    console.error("计算健康度失败:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "计算健康度失败，请稍后重试" },
      },
      { status: 500 }
    )
  }
}

// 解析并校验 LLM 输出
function parseHealthScoreResult(
  raw: string
): { success: true; data: HealthScoreResult } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(raw)
    const result = HealthScoreSchema.safeParse(parsed)
    if (result.success) {
      return { success: true, data: result.data }
    }
    return { success: false, error: result.error.message }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Invalid JSON",
    }
  }
}

// 按渠道分组统计互动
function groupByChannel(
  interactions: Array<{ channel: string; hasReply: boolean }>
): Record<string, { total: number; replied: number }> {
  const result: Record<string, { total: number; replied: number }> = {}
  for (const i of interactions) {
    if (!result[i.channel]) {
      result[i.channel] = { total: 0, replied: 0 }
    }
    result[i.channel].total++
    if (i.hasReply) result[i.channel].replied++
  }
  return result
}

// 从客户标签中提取复购意向与生命周期相关信号
function extractRepurchaseSignals(
  tags: Array<{ dimension: string; value: string; confidence: number | null }>
): Record<string, unknown> {
  const signals: Record<string, unknown> = {}
  for (const tag of tags) {
    const dim = tag.dimension.toLowerCase()
    if (
      dim.includes("repurchase") ||
      dim.includes("lifecycle") ||
      dim.includes("demand") ||
      dim.includes("intent") ||
      dim.includes("stage")
    ) {
      signals[tag.dimension] = { value: tag.value, confidence: tag.confidence }
    }
  }
  return signals
}

// 安全解析 JSON 字符串，失败时返回 fallback
function safeParseJSON<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}
