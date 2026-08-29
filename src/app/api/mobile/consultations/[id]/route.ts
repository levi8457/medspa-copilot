import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { consultationWhere, isConsultant } from "@/lib/mobile/consultation"

const endSessionSchema = z.object({
  status: z.literal("completed"),
  notes: z.string().trim().max(2000, "备注不能超过 2000 字").optional(),
})

async function requireConsultation(id: string) {
  const session = await auth()
  if (!session) return { error: NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 }) }
  if (!isConsultant(session)) return { error: NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "仅咨询师可使用现场咨询" } }, { status: 403 }) }
  const consultation = await prisma.consultationSession.findFirst({ where: consultationWhere(session, id) })
  if (!consultation) return { error: NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "现场咨询不存在或无权访问" } }, { status: 404 }) }
  return { session, consultation }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await requireConsultation(id)
  if ("error" in result) return result.error

  const consultation = await prisma.consultationSession.findFirst({
    where: consultationWhere(result.session, id),
    include: {
      customer: { select: { id: true, name: true, phone: true, status: true, tags: { select: { dimension: true, value: true } } } },
      consents: { orderBy: { consentedAt: "desc" }, take: 1 },
      transcriptSegments: { where: { state: "confirmed" }, orderBy: { sequence: "asc" }, take: 200 },
      suggestions: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  })
  return NextResponse.json({ success: true, data: consultation })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await requireConsultation(id)
  if ("error" in result) return result.error

  const body = endSessionSchema.safeParse(await request.json())
  if (!body.success) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: body.error.issues[0]?.message ?? "参数无效" } }, { status: 400 })
  if (result.consultation.status !== "recording" && result.consultation.status !== "processing") {
    return NextResponse.json({ success: false, error: { code: "INVALID_STATE", message: "当前会话尚未开始或已经结束" } }, { status: 409 })
  }

  const updated = await prisma.$transaction(async (tx) => {
    const session = await tx.consultationSession.update({
      where: { id },
      data: { status: "completed", endedAt: new Date(), notes: body.data.notes },
    })
    await tx.auditLog.create({
      data: { orgId: session.orgId, userId: result.session.user.id, action: "consultation_session.complete", resourceType: "ConsultationSession", resourceId: id },
    })
    return session
  })

  return NextResponse.json({ success: true, data: updated })
}
