import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { consultantCustomerWhere, isConsultant } from "@/lib/mobile/consultation"

const createSessionSchema = z.object({
  customerId: z.string().min(1, "请选择客户"),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  if (!isConsultant(session)) return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "仅咨询师可使用现场咨询" } }, { status: 403 })

  const consultations = await prisma.consultationSession.findMany({
    where: { orgId: session.user.orgId, consultantId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: { customer: { select: { id: true, name: true, phone: true } } },
  })

  return NextResponse.json({ success: true, data: consultations })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  if (!isConsultant(session)) return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "仅咨询师可使用现场咨询" } }, { status: 403 })

  const body = createSessionSchema.safeParse(await request.json())
  if (!body.success) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: body.error.issues[0]?.message ?? "参数无效" } }, { status: 400 })

  const customer = await prisma.customer.findFirst({
    where: consultantCustomerWhere(session, body.data.customerId),
    select: { id: true },
  })
  if (!customer) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "客户不存在或不属于你" } }, { status: 404 })

  const consultation = await prisma.$transaction(async (tx) => {
    const created = await tx.consultationSession.create({
      data: { orgId: session.user.orgId, customerId: customer.id, consultantId: session.user.id },
    })
    await tx.auditLog.create({
      data: {
        orgId: session.user.orgId,
        userId: session.user.id,
        action: "consultation_session.create",
        resourceType: "ConsultationSession",
        resourceId: created.id,
        newValue: JSON.stringify({ customerId: customer.id }),
      },
    })
    return created
  })

  return NextResponse.json({ success: true, data: consultation }, { status: 201 })
}
