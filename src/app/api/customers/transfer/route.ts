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

  // Get current customer
  const customer = await prisma.customer.findUnique({ where: { id: customerId } })
  if (!customer) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "客户不存在" } }, { status: 404 })
  }

  // A transfer may only assign a consultant from the customer's organization.
  const targetUser = await prisma.user.findFirst({
    where: { id: targetConsultantId, orgId: customer.orgId, role: "consultant" },
  })
  if (!targetUser) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "目标咨询师不存在" } }, { status: 404 })
  }

  const oldConsultantId = customer.consultantId

  const reassignedPendingTaskCount = await prisma.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id: customerId },
      data: { consultantId: targetConsultantId },
    })

    // Completed and skipped tasks remain with their original executor for audit.
    const reassignedTasks = await tx.followUpTask.updateMany({
      where: {
        orgId: customer.orgId,
        customerId,
        ...(oldConsultantId ? { consultantId: oldConsultantId } : {}),
        status: "pending",
      },
      data: { consultantId: targetConsultantId },
    })

    await tx.auditLog.create({
      data: {
        orgId: customer.orgId,
        userId: session.user.id,
        action: "customer.transfer",
        resourceType: "Customer",
        resourceId: customerId,
        oldValue: JSON.stringify({ consultantId: oldConsultantId }),
        newValue: JSON.stringify({
          consultantId: targetConsultantId,
          reassignedPendingTaskCount: reassignedTasks.count,
        }),
      },
    })

    await tx.timelineEvent.create({
      data: {
        orgId: customer.orgId,
        customerId,
        type: "note",
        title: "客户转移",
        content: `客户已从咨询师转移给 ${targetUser.name}，同步转移 ${reassignedTasks.count} 个待办任务`,
      },
    })

    return reassignedTasks.count
  })

  return NextResponse.json({
    success: true,
    data: { customerId, targetConsultantId, reassignedPendingTaskCount },
  })
}
