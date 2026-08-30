import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  }

  const existing = await prisma.ticket.findFirst({
    where: {
      orgId: session.user.orgId,
      userId: session.user.id,
      category: "account_deletion",
      status: { in: ["pending", "processing"] },
    },
    select: { id: true, status: true },
  })

  if (existing) {
    return NextResponse.json({ success: true, data: { ticketId: existing.id, status: existing.status, alreadyRequested: true } })
  }

  const ticket = await prisma.$transaction(async (tx) => {
    const created = await tx.ticket.create({
      data: {
        orgId: session.user.orgId,
        userId: session.user.id,
        subject: "App 内账号删除申请",
        category: "account_deletion",
        priority: "high",
        description: "用户通过咨询师 App 发起账号删除申请。请按机构数据保留政策核验并处理。",
      },
    })
    await tx.auditLog.create({
      data: {
        orgId: session.user.orgId,
        userId: session.user.id,
        action: "account.deletion_request",
        resourceType: "Ticket",
        resourceId: created.id,
      },
    })
    return created
  })

  return NextResponse.json({ success: true, data: { ticketId: ticket.id, status: ticket.status, alreadyRequested: false } }, { status: 201 })
}
