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

// 从 profile-report.md 中提取 System Prompt 段落
function getSystemPrompt(): string {
  const full = loadPrompt("profile-report.md")
  const match = full.match(/## System Prompt([\s\S]*?)## User Prompt/)
  if (!match) {
    throw new Error("profile-report.md 格式错误：找不到 System Prompt 段落")
  }
  return match[1].trim()
}

// 画像报告输出 Schema（7 维度）
const ProfileReportSchema = z.object({
  overview: z.string().min(1),
  decisionStyle: z.string().min(1),
  communication: z.string().min(1),
  coreNeeds: z.string().min(1),
  recommendations: z.string().min(1),
  riskPoints: z.string().min(1),
  nextActions: z.string().min(1),
})

type ProfileReportResult = z.infer<typeof ProfileReportSchema>

const MAX_RETRIES = 2

// GET - 获取该客户的画像报告历史列表（按 createdAt 降序），返回最新一条和总数
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

    // 验证客户归属权限（consultant 只能看自己的客户）
    const hasAccess = await validateResourceOwnership("Customer", id, session)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "无权访问此客户" } },
        { status: 403 }
      )
    }

    // 查询该客户所有画像报告（按创建时间降序）
    const reports = await prisma.customerProfileReport.findMany({
      where: { customerId: id, orgId: session.user.orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        version: true,
        status: true,
        generatedAt: true,
        createdAt: true,
        overview: true,
      },
    })

    // 查询最新一条完整报告
    const latest =
      reports.length > 0
        ? await prisma.customerProfileReport.findUnique({
            where: { id: reports[0].id },
          })
        : null

    return NextResponse.json({
      success: true,
      data: {
        total: reports.length,
        latest,
        history: reports,
      },
    })
  } catch (error) {
    console.error("获取画像报告列表失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取画像报告列表失败" } },
      { status: 500 }
    )
  }
}
// POST - 触发生成新的客户画像报告
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
      select: { id: true, consultantId: true },
    })

    if (!customer) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "客户不存在" } },
        { status: 404 }
      )
    }

    // consultant 角色额外校验 consultantId 归属（只能操作自己的客户）
    if (session.user.role === "consultant" && customer.consultantId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "无权操作此客户" } },
        { status: 403 }
      )
    }
    // 查询客户完整上下文：基本信息 + 标签 + 互动(最近20条) + 消费 + 跟进 + 推荐
    const [customerDetail, tags, interactions, consumptionRecords, followUpTasks, recommendations] =
      await Promise.all([
        prisma.customer.findUnique({
          where: { id },
          select: {
            name: true,
            phone: true,
            wechat: true,
            age: true,
            gender: true,
            source: true,
            status: true,
            tier: true,
            tierScore: true,
            rfmScore: true,
            healthScore: true,
            notes: true,
            createdAt: true,
          },
        }),
        prisma.customerTag.findMany({
          where: { customerId: id, orgId: session.user.orgId },
          select: { dimension: true, value: true, confidence: true },
        }),
        prisma.customerInteraction.findMany({
          where: { customerId: id, orgId: session.user.orgId },
          orderBy: { occurredAt: "desc" },
          take: 20,
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
        prisma.consumptionRecord.findMany({
          where: { customerId: id, orgId: session.user.orgId },
          orderBy: { consumedAt: "desc" },
          select: { amount: true, items: true, notes: true, consumedAt: true },
        }),
        prisma.followUpTask.findMany({
          where: { customerId: id, orgId: session.user.orgId },
          orderBy: { scheduledDate: "desc" },
          take: 20,
          select: {
            scheduledDate: true,
            goal: true,
            status: true,
            skipReason: true,
            executedAt: true,
          },
        }),
        prisma.projectRecommendation.findMany({
          where: { customerId: id, orgId: session.user.orgId },
          select: {
            score: true,
            reason: true,
            status: true,
            project: { select: { name: true, category: true, priceMin: true, priceMax: true } },
          },
        }),
      ])
    // 组装客户标签为对象格式
    const customerTags: Record<string, unknown> = {}
    for (const tag of tags) {
      customerTags[tag.dimension] = tag.value
    }

    // 加载 System Prompt
    const systemPrompt = getSystemPrompt()
    const today = new Date().toISOString().split("T")[0]

    // 组装 User Prompt
    const userPrompt = [
      "请基于以下客户完整上下文，生成 7 维度深度画像报告，严格输出 JSON。",
      "",
      `【今天日期】 ${today}`,
      "",
      "【客户基础资料】",
      JSON.stringify(customerDetail, null, 2),
      "",
      "【客户标签画像】（来自录音解析与人工补充，JSON 格式）",
      JSON.stringify(customerTags, null, 2),
      "",
      "【客户互动记录】（最近 20 条，按时间倒序）",
      JSON.stringify(interactions, null, 2),
      "",
      "【消费记录】",
      JSON.stringify(consumptionRecords, null, 2),
      "",
      "【跟进历史】",
      JSON.stringify(followUpTasks, null, 2),
      "",
      "【项目推荐记录】",
      JSON.stringify(recommendations, null, 2),
    ].join("\n")

    // 调用 DeepSeek 生成画像（带 Zod 校验 + 重试，最多 2 次）
    let lastError = ""
    let reportResult: ProfileReportResult | null = null

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
        temperature: 0.4,
        max_tokens: 4096,
      })

      const raw = completion.choices[0]?.message?.content ?? ""
      const parsed = parseReportResult(raw)

      if (parsed.success) {
        reportResult = parsed.data
        break
      }

      lastError = parsed.error
      console.warn(`[profile-report] attempt ${attempt + 1} failed: ${lastError}`)
    }

    if (!reportResult) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "LLM_GENERATION_FAILED", message: "画像报告生成失败，请稍后重试" },
        },
        { status: 500 }
      )
    }
    // 组装完整 Markdown 内容（fullContent 由 7 维度拼接而成）
    const fullContent = [
      "# 客户画像深度报告",
      "",
      `> 生成时间：${today}`,
      "",
      "## 一、基础画像速览",
      reportResult.overview,
      "",
      "## 二、决策风格分析",
      reportResult.decisionStyle,
      "",
      "## 三、沟通策略建议",
      reportResult.communication,
      "",
      "## 四、核心需求与顾虑点",
      reportResult.coreNeeds,
      "",
      "## 五、推荐项目与时机",
      reportResult.recommendations,
      "",
      "## 六、风险点提示",
      reportResult.riskPoints,
      "",
      "## 七、下一步行动建议",
      reportResult.nextActions,
    ].join("\n")

    // 计算 version = 现有最大 version + 1
    const latestVersionReport = await prisma.customerProfileReport.findFirst({
      where: { customerId: id },
      orderBy: { version: "desc" },
      select: { version: true },
    })
    const nextVersion = (latestVersionReport?.version ?? 0) + 1

    // 咨询师归属：consultant 角色记录自己的 userId，admin 角色记录客户的 consultantId
    const reportConsultantId =
      session.user.role === "consultant" ? session.user.id : customer.consultantId

    // 存入 CustomerProfileReport
    const report = await prisma.customerProfileReport.create({
      data: {
        orgId: session.user.orgId,
        customerId: id,
        consultantId: reportConsultantId,
        version: nextVersion,
        overview: reportResult.overview,
        decisionStyle: reportResult.decisionStyle,
        communication: reportResult.communication,
        coreNeeds: reportResult.coreNeeds,
        recommendations: reportResult.recommendations,
        riskPoints: reportResult.riskPoints,
        nextActions: reportResult.nextActions,
        fullContent,
        status: "completed",
      },
    })

    return NextResponse.json({
      success: true,
      data: report,
    })
  } catch (error) {
    console.error("生成画像报告失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "画像报告生成失败，请稍后重试" } },
      { status: 500 }
    )
  }
}

// 解析并校验 LLM 输出
function parseReportResult(
  raw: string
): { success: true; data: ProfileReportResult } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(raw)
    const result = ProfileReportSchema.safeParse(parsed)
    if (result.success) {
      return { success: true, data: result.data }
    }
    return { success: false, error: result.error.message }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Invalid JSON" }
  }
}