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
  const full = loadPrompt("compliance-check.md")
  const match = full.match(/## System Prompt([\s\S]*?)## User Prompt/)
  if (!match) throw new Error("compliance-check.md 格式错误：找不到 System Prompt 段落")
  return match[1].trim()
}

function getUserPromptTemplate(): string {
  const full = loadPrompt("compliance-check.md")
  const match = full.match(/## User Prompt([\s\S]*?)$/)
  if (!match) throw new Error("compliance-check.md 格式错误：找不到 User Prompt 段落")
  return match[1].trim()
}

// ── Zod Schema ──────────────────────────────────────────────

const ViolationItemSchema = z.object({
  type: z.enum(["violation", "warning"]),
  content: z.string(),
  reason: z.string(),
  suggestion: z.string(),
})

export const ComplianceResultSchema = z.object({
  passed: z.boolean(),
  risk_level: z.enum(["safe", "warning", "violation"]),
  violations: z.array(ViolationItemSchema),
  summary: z.string(),
})

export type ComplianceResult = z.infer<typeof ComplianceResultSchema>

// ── 输入接口 ─────────────────────────────────────────────────

interface ComplianceCheckInput {
  /** 待审查的话术内容 */
  script: string
  /** 客户称呼（可选） */
  customerName?: string
}

const MAX_RETRIES = 2

/**
 * 医疗合规审查 —— 对 AI 生成的话术进行二次合规过滤
 *
 * 审查规则详见 prompts/compliance-check.md：
 * - 绝对禁止内容 → passed: false, risk_level: "violation"
 * - 需谨慎表述 → passed: true, risk_level: "warning"
 * - 无问题 → passed: true, risk_level: "safe"
 *
 * 校验失败自动重试（最多 2 次）
 */
export async function complianceCheck(
  input: ComplianceCheckInput
): Promise<ComplianceResult> {
  const systemPrompt = getSystemPrompt()
  const userTemplate = getUserPromptTemplate()

  const userPrompt = userTemplate
    .replace("{{script}}", input.script)
    .replace("{{customer_name}}", input.customerName ?? "客户")

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
      model: "deepseek-chat",
      messages,
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 2048,
    })

    const raw = completion.choices[0]?.message?.content ?? ""
    const result = parseComplianceResult(raw)

    if (result.success) {
      return result.data
    }

    lastError = result.error
    console.warn(
      `[complianceCheck] attempt ${attempt + 1} failed: ${lastError}`
    )
  }

  // 审查失败时，安全降级：拦截话术（passed: false）
  console.error(
    `[complianceCheck] Failed after ${MAX_RETRIES + 1} attempts, defaulting to block`
  )
  return {
    passed: false,
    risk_level: "violation",
    violations: [],
    summary: "合规审查服务异常，话术已被安全拦截",
  }
}

function parseComplianceResult(
  raw: string
): { success: true; data: ComplianceResult } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(raw)
    const result = ComplianceResultSchema.safeParse(parsed)
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
