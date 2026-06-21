import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { validateResourceOwnership } from "@/lib/db-tenant"

// PATCH - 更新任务状态
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { status, skipReason } = body

  // 验证任务归属
  const hasAccess = await validateResourceOwnership("FollowUpTask", id, session)
  if (!hasAccess) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "无权操作此任务" } }, { status: 403 })
  }

  // 验证状态值
  const validStatuses = ["pending", "done", "skipped"]
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ success: false, error: { code: "INVALID_STATUS", message: "无效的状态值" } }, { status: 400 })
  }

  // 更新任务状态
  const updateData: Record<string, unknown> = {
    status,
    executedAt: new Date(),
  }

  if (status === "skipped" && skipReason) {
    updateData.skipReason = skipReason
  }

  const task = await prisma.followUpTask.update({
    where: { id },
    data: updateData,
  })

  // 记录审计日志
  await prisma.auditLog.create({
    data: {
      orgId: session.user.orgId,
      userId: session.user.id,
      action: `task.${status}`,
      resourceType: "FollowUpTask",
      resourceId: id,
      newValue: JSON.stringify({ status, skipReason }),
    },
  })

  return NextResponse.json({ success: true, data: task })
}