import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createRealtimeASRSession } from "@/lib/asr/realtime"
import { prisma } from "@/lib/db"
import { consultationWhere, isConsultant } from "@/lib/mobile/consultation"

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  if (!isConsultant(session)) return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "仅咨询师可开启实时转写" } }, { status: 403 })
  const { id } = await params
  const consultation = await prisma.consultationSession.findFirst({
    where: consultationWhere(session, id),
    include: { consents: { where: { withdrawnAt: null }, orderBy: { consentedAt: "desc" }, take: 1 } },
  })
  if (!consultation) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "现场咨询不存在或无权访问" } }, { status: 404 })
  if (consultation.status !== "recording" || consultation.consents.length === 0) {
    return NextResponse.json({ success: false, error: { code: "CONSENT_REQUIRED", message: "取得客户录音同意后才能开启实时转写" } }, { status: 409 })
  }

  try {
    const asrSession = createRealtimeASRSession()
    await prisma.auditLog.create({
      data: {
        orgId: consultation.orgId,
        userId: session.user.id,
        action: "consultation_session.realtime_asr.start",
        resourceType: "ConsultationSession",
        resourceId: consultation.id,
        newValue: JSON.stringify({ provider: asrSession.provider, expiresAt: asrSession.expiresAt }),
      },
    })
    return NextResponse.json({ success: true, data: asrSession })
  } catch (error) {
    console.error("Unable to create realtime ASR session:", error)
    return NextResponse.json({ success: false, error: { code: "ASR_UNAVAILABLE", message: "实时转写暂不可用，请继续本地记录后会后上传录音" } }, { status: 503 })
  }
}
