import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { validateResourceOwnership } from "@/lib/db-tenant"

// GET - SSE 端点，实时推送录音处理进度
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { id } = await params

  const hasAccess = await validateResourceOwnership("AudioRecord", id, session)
  if (!hasAccess) {
    return new Response("Forbidden", { status: 403 })
  }

  // 创建 SSE 流
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      // 发送初始连接成功消息
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`))

      let lastStatus = ""
      let isCompleted = false

      // 轮询数据库获取最新状态
      const pollInterval = setInterval(async () => {
        try {
          const recording = await prisma.audioRecord.findUnique({
            where: { id },
            select: {
              status: true,
              transcript: true,
              errorMessage: true,
              analyzedAt: true,
            },
          })

          if (!recording) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: "录音不存在" })}\n\n`))
            controller.close()
            clearInterval(pollInterval)
            return
          }

          // 状态有变化时推送
          if (recording.status !== lastStatus) {
            lastStatus = recording.status

            const progressData = {
              type: "progress",
              status: recording.status,
              timestamp: new Date().toISOString(),
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`))

            // 处理完成
            if (recording.status === "done") {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "completed",
                    transcript: recording.transcript,
                    analyzedAt: recording.analyzedAt,
                  })}\n\n`
                )
              )
              isCompleted = true
              controller.close()
              clearInterval(pollInterval)
            }

            // 处理失败
            if (recording.status === "failed") {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "failed",
                    error: recording.errorMessage,
                  })}\n\n`
                )
              )
              isCompleted = true
              controller.close()
              clearInterval(pollInterval)
            }
          }

          // 发送心跳
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`))
        } catch (error) {
          console.error("SSE 轮询错误:", error)
        }
      }, 1000) // 每秒轮询一次

      // 客户端断开连接时清理
      request.signal.addEventListener("abort", () => {
        clearInterval(pollInterval)
        controller.close()
      })
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