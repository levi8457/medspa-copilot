import fs from "node:fs"
import path from "node:path"
import OpenAI from "openai"
import { z } from "zod"

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
})

function loadPrompt(filename: string): string {
  return fs.readFileSync(path.join(process.cwd(), "prompts", filename), "utf-8")
}

function getSystemPrompt(): string {
  const full = loadPrompt("strategy-generation.md")
  const match = full.match(/## System Prompt([\s\S]*?)## User Prompt/)
  if (!match) throw new Error("strategy-generation.md 格式错误：找不到 System Prompt 段落")
  return match[1].trim()
}

// 跟进策略 Schema
const HookSchema = z.object({
  type: z.enum(["case_study", "knowledge", "promotion", "doctor_schedule", "concern_resolution", "care_greeting"]),
  content: z.string().min(1),
  targets_concern: z.string().nullable().optional(),
})

const FollowUpSchema = z.object({
  sequence: z.number(),
  day_offset: z.number(),
  scheduled_date: z.string(),
  channel: z.string(),
  objective: z.string().min(1),
  hook: HookSchema,
  script_direction: z.string().max(50),
  tone: z.enum(["warm", "professional", "casual"]),
  success_signal: z.string(),
  fallback: z.string(),
})

const ExitRuleSchema = z.object({
  no_response_threshold: z.number(),
  action: z.string(),
})

const StrategyResultSchema = z.object({
  plan_feasible: z.boolean(),
  infeasible_reason: z.string().nullable().optional(),
  strategy_summary: z.string(),
  primary_project: z.string(),
  overall_rhythm: z.enum(["intensive", "moderate", "nurturing"]),
  adjustment_note: z.string().nullable().optional(),
  follow_ups: z.array(FollowUpSchema).min(1).max(6),
  exit_rule: ExitRuleSchema,
  escalation_note: z.string(),
  risk_warnings: z.array(z.string()),
})

export type StrategyResult = z.infer<typeof StrategyResultSchema>

interface GenerateStrategyInput {
  customerTags: Record<string, unknown>
  consultantNotes?: string
  sopTemplate?: Record<string, unknown>
  contentAssets?: string[]
}

const MAX_RETRIES = 2

export async function generateStrategy(input: GenerateStrategyInput): Promise<StrategyResult> {
  const systemPrompt = getSystemPrompt()
  const today = new Date().toISOString().split("T")[0]

  const userPrompt = [
    "请为以下客户生成个性化跟进策略，严格输出 JSON。",
    "",
    `【今天日期】 ${today}`,
    "",
    "【客户标签画像】（来自录音解析，JSON 格式）",
    JSON.stringify(input.customerTags, null, 2),
    "",
    "【客户补充背景】（咨询师手动备注）",
    input.consultantNotes || "（无）",
    "",
    "【机构 SOP 模板】",
    input.sopTemplate ? JSON.stringify(input.sopTemplate, null, 2) : "（无，按通用最佳实践设计）",
    "",
    "【机构可用的内容抓手库】",
    input.contentAssets?.length ? input.contentAssets.join("\n") : "（无）",
  ].join("\n")

  let lastError = ""

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]

    if (attempt > 0) {
      messages.push({
        role: "user",
        content: `你上一次的输出未通过格式校验，错误信息：${lastError}\n请修正后重新输出完整 JSON。`,
      })
    }

    const completion = await deepseek.chat.completions.create({
      model: "deepseek-reasoner",
      messages,
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 4096,
    })

    const raw = completion.choices[0]?.message?.content ?? ""
    const result = parseStrategyResult(raw)

    if (result.success) {
      return result.data
    }

    lastError = result.error
    console.warn(`[generateStrategy] attempt ${attempt + 1} failed: ${lastError}`)
  }

  throw new Error(`Strategy generation failed after ${MAX_RETRIES + 1} attempts: ${lastError}`)
}

function parseStrategyResult(raw: string): { success: true; data: StrategyResult } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(raw)
    const result = StrategyResultSchema.safeParse(parsed)
    if (result.success) {
      return { success: true, data: result.data }
    }
    return { success: false, error: result.error.message }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Invalid JSON" }
  }
}