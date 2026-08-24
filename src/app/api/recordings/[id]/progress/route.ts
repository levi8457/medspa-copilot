import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { validateResourceOwnership } from "@/lib/db-tenant"

const POLL_INTERVAL_MS = 1_000
const HEARTBEAT_INTERVAL_MS = 15_000
const MAX_CONNECTION_MS = 15 * 60 * 1_000

type RecordingProgress = {
  status: string
  transcript: string | null
  errorMessage: string | null
  analyzedAt: Date | null
  updatedAt: Date
}

// GET - SSE endpoint for recording processing progress.
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

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      let lastVersion = ""
      let polling = false

      const close = () => {
        if (closed) return
        closed = true
        clearInterval(pollTimer)
        clearInterval(heartbeatTimer)
        clearTimeout(connectionTimer)
        controller.close()
      }

      const send = (data: Record<string, unknown>, eventId?: string) => {
        if (closed) return
        const idLine = eventId ? `id: ${eventId}\n` : ""
        controller.enqueue(encoder.encode(`${idLine}data: ${JSON.stringify(data)}\n\n`))
      }

      const publish = (recording: RecordingProgress) => {
        const version = `${recording.updatedAt.toISOString()}-${recording.status}`
        if (version === lastVersion) return
        lastVersion = version

        send(
          {
            type: "progress",
            status: recording.status,
            timestamp: recording.updatedAt.toISOString(),
          },
          version
        )

        if (recording.status === "done") {
          send(
            {
              type: "completed",
              transcript: recording.transcript,
              analyzedAt: recording.analyzedAt,
            },
            version
          )
          close()
        } else if (recording.status === "failed") {
          send(
            { type: "failed", error: recording.errorMessage || "处理失败" },
            version
          )
          close()
        }
      }

      const poll = async () => {
        if (closed || polling) return
        polling = true
        try {
          const recording = await prisma.audioRecord.findUnique({
            where: { id },
            select: {
              status: true,
              transcript: true,
              errorMessage: true,
              analyzedAt: true,
              updatedAt: true,
            },
          })
          if (!recording) {
            send({ type: "error", message: "录音不存在" })
            close()
            return
          }
          publish(recording)
        } catch (error) {
          console.error("Recording progress SSE poll failed:", error)
          send({ type: "error", message: "解析进度获取失败，请重试" })
        } finally {
          polling = false
        }
      }

      const pollTimer = setInterval(() => void poll(), POLL_INTERVAL_MS)
      const heartbeatTimer = setInterval(() => send({ type: "heartbeat" }), HEARTBEAT_INTERVAL_MS)
      const connectionTimer = setTimeout(() => {
        send({ type: "reconnect", retryAfterMs: 5_000 })
        close()
      }, MAX_CONNECTION_MS)

      controller.enqueue(encoder.encode("retry: 5000\n\n"))
      send({ type: "connected" })
      await poll()
      request.signal.addEventListener("abort", close, { once: true })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
