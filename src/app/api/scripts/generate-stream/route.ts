import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { validateResourceOwnership } from "@/lib/db-tenant"
import fs from "node:fs"
import path from "node:path"
import OpenAI from "openai"

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

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = await request.json()
  const { taskId, customerId } = body

  if (!taskId || !customerId) {
    return new Response("Missing params", { status: 400 })
  }

  const hasAccess = await validateResourceOwnership("FollowUpTask", taskId, session)
  if (!hasAccess) {
    return new Response("Forbidden", { status: 403 })
  }

  const task = await prisma.followUpTask.findUnique({
    where: { id: taskId },
    include: { plan: { select: { strategy: true } } },
  })

  if (!task) {
    return new Response("Task not found", { status: 404 })
  }

  const tags = await prisma.customerTag.findMany({
    where: { customerId, orgId: session.user.orgId },
  })

  const customerTags: Record<string, unknown> = {}
  for (const tag of tags) {
    customerTags[tag.dimension] = tag.value
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { name: true },
  })

  const scriptData = task.script ? JSON.parse(task.script) : {}
  const systemPrompt = getSystemPrompt()

  const userPrompt = [
    "请根据以下信息，生成一段微信跟进话术，严格输出 JSON。",
    "",
    "【客户标签】",
    JSON.stringify(customerTags, null, 2),
    "",
    "【本次跟进目标】",
    task.goal || "跟进客户",
    "",
    "【话术方向要点】",
    scriptData.direction || "",
    "",
    "【跟进抓手】",
    scriptData.hook?.content || "",
    "",
    "【语气风格】",
    scriptData.tone || "warm",
    "",
    "【客户称呼】",
    customer?.name || "客户",
  ].join("\n")

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const completion = await deepseek.chat.completions.create({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
          max_tokens: 2048,
          stream: true,
        })

        let accumulated = ""

        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content
          if (content) {
            accumulated += content
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "chunk", content })}\n\n`)
            )
          }
        }

        // Parse the complete JSON result
        try {
          const parsed = JSON.parse(accumulated)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                script: parsed.script || "",
                subjectLine: parsed.subject_line || "",
                keyPoints: parsed.key_points || [],
                compliancePassed: parsed.compliance_check?.passed ?? true,
                complianceWarnings: parsed.compliance_check?.warnings || [],
              })}\n\n`
            )
          )
        } catch {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message: "解析结果失败" })}\n\n`)
          )
        }

        controller.close()
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: error instanceof Error ? error.message : "生成失败" })}\n\n`
          )
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
