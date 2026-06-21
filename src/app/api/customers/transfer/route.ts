import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { validateResourceOwnership } from "@/lib/db-tenant"
import { z } from "zod"

const transferSchema = z.object({
  customerId: z.string(),
  targetConsultantId: z.string(),
})

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session || session.user.role === "consultant") {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401 })
  }

  const body = await request.json()
  const result = transferSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } },
      { status: 400 }
    )
  }

  const { customerId, targetConsultantId } = result.data

  const hasAccess = await validateResourceOwnership("Customer", customerId, session)
  if (!hasAccess) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "无权操作此客户" } }, { status: 403 })
  }

  // Verify target consultant belongs to same org
  const targetUser = await prisma.user.findFirst({
    where: { id: targetConsultantId, orgId: session.user.orgId, role: "consultant" },
  })
  if (!targetUser) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "目标咨询师不存在" } }, { status: 404 })
  }

  // Get current customer
  const customer = await prisma.customer.findUnique({ where: { id: customerId } })
  if (!customer) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "客户不存在" } }, { status: 404 })
  }

  const oldConsultantId = customer.consultantId

  // Transfer customer
  await prisma.customer.update({
    where: { id: customerId },
    data: { consultantId: targetConsultantId },
  })

  // Create audit log
  await prisma.auditLog.create({
    data: {
      orgId: session.user.orgId,
      userId: session.user.id,
      action: "customer.transfer",
      resourceType: "Customer",
      resourceId: customerId,
      oldValue: JSON.stringify({ consultantId: oldConsultantId }),
      newValue: JSON.stringify({ consultantId: targetConsultantId }),
    },
  })

  // Create timeline event
  await prisma.timelineEvent.create({
    data: {
      orgId: session.user.orgId,
      customerId,
      type: "note",
      title: "客户转移",
      content: `客户已从咨询师转移给 ${targetUser.name}`,
    },
  })

  return NextResponse.json({ success: true, data: { customerId, targetConsultantId } })
}
