import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { consultationWhere, isConsultant } from "@/lib/mobile/consultation"

const transcriptSchema = z.object({
  sequence: z.number().int().nonnegative(),
  text: z.string().trim().min(1, "转写内容不能为空").max(2000, "单段转写不能超过 2000 字"),
  state: z.enum(["partial", "confirmed"]).default("confirmed"),
  speakerGroup: z.enum(["A", "B", "unknown"]).optional(),
  startedAtMs: z.number().int().nonnegative().optional(),
  endedAtMs: z.number().int().nonnegative().optional(),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  if (!isConsultant(session)) return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "仅咨询师可写入现场转写" } }, { status: 403 })
  const { id } = await params
  const body = transcriptSchema.safeParse(await request.json())
  if (!body.success) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: body.error.issues[0]?.message ?? "转写参数无效" } }, { status: 400 })
  if (body.data.startedAtMs !== undefined && body.data.endedAtMs !== undefined && body.data.endedAtMs < body.data.startedAtMs) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "转写结束时间不能早于开始时间" } }, { status: 400 })
  }

  const consultation = await prisma.consultationSession.findFirst({ where: consultationWhere(session, id) })
  if (!consultation) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "现场咨询不存在或无权访问" } }, { status: 404 })
  if (consultation.status !== "recording") return NextResponse.json({ success: false, error: { code: "INVALID_STATE", message: "只有已取得同意的进行中会话可以保存转写" } }, { status: 409 })

  const segment = await prisma.realtimeTranscriptSegment.upsert({
    where: { consultationSessionId_sequence: { consultationSessionId: consultation.id, sequence: body.data.sequence } },
    create: { orgId: consultation.orgId, consultationSessionId: consultation.id, ...body.data },
    update: { text: body.data.text, state: body.data.state, speakerGroup: body.data.speakerGroup, startedAtMs: body.data.startedAtMs, endedAtMs: body.data.endedAtMs },
  })

  return NextResponse.json({ success: true, data: segment })
}
