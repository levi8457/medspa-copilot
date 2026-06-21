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
  const full = loadPrompt("script-generation.md")
  const match = full.match(/## System Prompt([\s\S]*?)## User Prompt/)
  if (!match) throw new Error("script-generation.md 格式错误：找不到 System Prompt 段落")
  return match[1].trim()
}

const ScriptResultSchema = z.object({
  script: z.string().min(1),
  subject_line: z.string().min(1),
  key_points: z.array(z.string()).min(1).max(5),
  compliance_check: z.object({
    passed: z.boolean(),
    warnings: z.array(z.string()),
  }),
})

export type ScriptResult = z.infer<typeof ScriptResultSchema>

interface GenerateScriptInput {
  customerTags: Record<string, unknown>
  objective: string
  scriptDirection: string
  hookContent: string
  tone: string
  customerName: string
}

const MAX_RETRIES = 1

export async function generateScript(input: GenerateScriptInput): Promise<ScriptResult> {
  const systemPrompt = getSystemPrompt()

  const userPrompt = [
    "请根据以下信息，生成一段微信跟进话术，严格输出 JSON。",
    "",
    "【客户标签】",
    JSON.stringify(input.customerTags, null, 2),
    "",
    "【本次跟进目标】",
    input.objective,
    "",
    "【话术方向要点】",
    input.scriptDirection,
    "",
    "【跟进抓手】",
    input.hookContent,
    "",
    "【语气风格】",
    input.tone,
    "",
    "【客户称呼】",
    input.customerName,
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
      model: "deepseek-chat",
      messages,
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2048,
    })

    const raw = completion.choices[0]?.message?.content ?? ""
    const result = parseScriptResult(raw)

    if (result.success) {
      return result.data
    }

    lastError = result.error
    console.warn(`[generateScript] attempt ${attempt + 1} failed: ${lastError}`)
  }

  throw new Error(`Script generation failed after ${MAX_RETRIES + 1} attempts: ${lastError}`)
}

function parseScriptResult(raw: string): { success: true; data: ScriptResult } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(raw)
    const result = ScriptResultSchema.safeParse(parsed)
    if (result.success) {
      return { success: true, data: result.data }
    }
    return { success: false, error: result.error.message }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Invalid JSON" }
  }
}