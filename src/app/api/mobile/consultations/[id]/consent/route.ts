import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { CONSULTATION_POLICY_VERSION, consultationWhere, isConsultant } from "@/lib/mobile/consultation"

const consentSchema = z.object({ consented: z.literal(true), policyVersion: z.string().trim().min(1).max(100).default(CONSULTATION_POLICY_VERSION) })

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  if (!isConsultant(session)) return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "仅咨询师可记录录音同意" } }, { status: 403 })
  const { id } = await params
  const body = consentSchema.safeParse(await request.json())
  if (!body.success) return NextResponse.json({ success: false, error: { code: "CONSENT_REQUIRED", message: "客户同意录音后才能开始现场咨询" } }, { status: 400 })

  const consultation = await prisma.consultationSession.findFirst({ where: consultationWhere(session, id) })
  if (!consultation) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "现场咨询不存在或无权访问" } }, { status: 404 })
  if (consultation.status !== "draft") return NextResponse.json({ success: false, error: { code: "INVALID_STATE", message: "当前会话不能重复记录同意" } }, { status: 409 })

  const now = new Date()
  const updated = await prisma.$transaction(async (tx) => {
    const consent = await tx.recordingConsent.create({
      data: { orgId: consultation.orgId, customerId: consultation.customerId, consultationSessionId: consultation.id, recordedById: session.user.id, policyVersion: body.data.policyVersion, consentedAt: now },
    })
    const activeSession = await tx.consultationSession.update({
      where: { id: consultation.id },
      data: { status: "recording", consentVersion: body.data.policyVersion, consentRecordedAt: now, startedAt: now },
    })
    await tx.auditLog.create({
      data: { orgId: consultation.orgId, userId: session.user.id, action: "consultation_session.consent", resourceType: "RecordingConsent", resourceId: consent.id, newValue: JSON.stringify({ policyVersion: consent.policyVersion }) },
    })
    return { consent, session: activeSession }
  })

  return NextResponse.json({ success: true, data: updated })
}
