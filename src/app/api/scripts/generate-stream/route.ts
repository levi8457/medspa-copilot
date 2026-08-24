import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { validateResourceOwnership } from "@/lib/db-tenant"
import { generateScript } from "@/lib/ai/generate-script"
import { complianceCheck } from "@/lib/ai/compliance-check"
import { recordScriptGeneration } from "@/lib/ai/script-generation-audit"

const CHUNK_SIZE = 24

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = await request.json()
  const { taskId } = body
  if (!taskId) {
    return new Response("Missing params", { status: 400 })
  }

  const hasTaskAccess = await validateResourceOwnership("FollowUpTask", taskId, session)
  if (!hasTaskAccess) {
    return new Response("Forbidden", { status: 403 })
  }

  const task = await prisma.followUpTask.findUnique({
    where: { id: taskId },
  })
  if (!task) {
    return new Response("Task not found", { status: 404 })
  }

  const customerId = task.customerId
  const hasCustomerAccess = await validateResourceOwnership("Customer", customerId, session)
  if (!hasCustomerAccess) {
    return new Response("Forbidden", { status: 403 })
  }

  const [tags, customer] = await Promise.all([
    prisma.customerTag.findMany({ where: { customerId, orgId: session.user.orgId } }),
    prisma.customer.findFirst({
      where: { id: customerId, orgId: session.user.orgId },
      select: { name: true },
    }),
  ])
  if (!customer) {
    return new Response("Customer not found", { status: 404 })
  }

  const customerTags: Record<string, string[]> = {}
  for (const tag of tags) {
    customerTags[tag.dimension] ??= []
    customerTags[tag.dimension].push(tag.value)
  }

  let scriptData: Record<string, unknown> = {}
  try {
    scriptData = task.script ? JSON.parse(task.script) : {}
  } catch {
    return new Response("Task script data is invalid", { status: 500 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Do not expose model output until the independent compliance check passes.
        const scriptResult = await generateScript({
          customerTags,
          objective: task.goal || "跟进客户",
          scriptDirection: typeof scriptData.direction === "string" ? scriptData.direction : "",
          hookContent:
            typeof scriptData.hook === "object" && scriptData.hook !== null &&
            "content" in scriptData.hook && typeof scriptData.hook.content === "string"
              ? scriptData.hook.content
              : "",
          tone:
            scriptData.tone === "professional" || scriptData.tone === "casual"
              ? scriptData.tone
              : "warm",
          customerName: customer.name || "客户",
        })
        const compliance = await complianceCheck({
          script: scriptResult.script,
          customerName: customer.name || "客户",
        })

        if (!compliance.passed) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                code: "COMPLIANCE_VIOLATION",
                message: "话术未通过医疗合规审查，请修改后重试",
              })}\n\n`
            )
          )
          return
        }

        await recordScriptGeneration({
          orgId: task.orgId,
          taskId: task.id,
          customerId,
          consultantId: session.user.id,
          inputSnapshot: {
            customerTags,
            objective: task.goal || "跟进客户",
            scriptDirection: typeof scriptData.direction === "string" ? scriptData.direction : "",
            hookContent:
              typeof scriptData.hook === "object" && scriptData.hook !== null &&
              "content" in scriptData.hook && typeof scriptData.hook.content === "string"
                ? scriptData.hook.content
                : "",
            tone: scriptData.tone || "warm",
          },
          result: scriptResult,
          compliance,
        })

        for (let start = 0; start < scriptResult.script.length; start += CHUNK_SIZE) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "chunk",
                content: scriptResult.script.slice(start, start + CHUNK_SIZE),
              })}\n\n`
            )
          )
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              script: scriptResult.script,
              subjectLine: scriptResult.subject_line,
              keyPoints: scriptResult.key_points,
              compliancePassed: true,
              complianceWarnings: compliance.violations
                .filter((violation) => violation.type === "warning")
                .map((violation) => `${violation.content}：${violation.suggestion}`),
            })}\n\n`
          )
        )
      } catch (error) {
        console.error("Stream script generation failed:", error)
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", message: "话术生成失败，请稍后重试" })}\n\n`)
        )
      } finally {
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
