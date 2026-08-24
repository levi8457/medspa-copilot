import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { validateResourceOwnership } from "@/lib/db-tenant"
import { z } from "zod"

const updateTaskStatusSchema = z.object({
  status: z.enum(["pending", "done", "skipped", "postponed"]),
  skipReason: z.string().trim().min(1, "跳过任务时必须填写原因").optional(),
  postponedTo: z.string().date("延期日期格式无效").optional(),
}).superRefine((value, context) => {
  if (value.status === "skipped" && !value.skipReason) {
    context.addIssue({
      code: "custom",
      path: ["skipReason"],
      message: "跳过任务时必须填写原因",
    })
  }
  if (value.status === "postponed" && !value.postponedTo) {
    context.addIssue({
      code: "custom",
      path: ["postponedTo"],
      message: "延期任务时必须选择新的执行日期",
    })
  }
})

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
  const parsedBody = updateTaskStatusSchema.safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: parsedBody.error.issues[0].message } },
      { status: 400 }
    )
  }
  const { status, skipReason, postponedTo } = parsedBody.data

  // 验证任务归属
  const hasAccess = await validateResourceOwnership("FollowUpTask", id, session)
  if (!hasAccess) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "无权操作此任务" } }, { status: 403 })
  }

  const currentTask = await prisma.followUpTask.findUnique({ where: { id } })
  if (!currentTask) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "任务不存在" } },
      { status: 404 }
    )
  }
  if (currentTask.status === status && status !== "postponed") {
    return NextResponse.json({ success: true, data: currentTask })
  }
  if (currentTask.status !== "pending" && currentTask.status !== "postponed") {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_STATE", message: "已执行任务不可重复变更状态" } },
      { status: 409 }
    )
  }

  const executedAt = new Date()
  const postponedDate = postponedTo ? new Date(`${postponedTo}T00:00:00+08:00`) : null
  if (postponedDate && postponedDate <= executedAt) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "延期日期必须晚于当前时间" } },
      { status: 400 }
    )
  }
  const task = await prisma.$transaction(async (tx) => {
    // Optimistic state guard prevents two browser retries from both writing an event.
    const updateResult = await tx.followUpTask.updateMany({
      where: { id, orgId: currentTask.orgId, status: { in: ["pending", "postponed"] } },
      data: {
        status,
        executedAt: status === "done" || status === "skipped" ? executedAt : null,
        skipReason: status === "skipped" ? skipReason : null,
        ...(postponedDate ? { scheduledDate: postponedDate } : {}),
      },
    })
    if (updateResult.count === 0) {
      return null
    }

    const updatedTask = await tx.followUpTask.findUnique({ where: { id } })
    if (!updatedTask) {
      return null
    }

    await tx.auditLog.create({
      data: {
        orgId: updatedTask.orgId,
        userId: session.user.id,
        action: `task.${status}`,
        resourceType: "FollowUpTask",
        resourceId: id,
        newValue: JSON.stringify({ status, skipReason, postponedTo }),
      },
    })

    await tx.timelineEvent.create({
      data: {
        orgId: updatedTask.orgId,
        customerId: updatedTask.customerId,
        type: "task",
        title: status === "done" ? "跟进任务已完成" : status === "skipped" ? "跟进任务已跳过" : "跟进任务已延期",
        content: skipReason || (postponedTo ? `延期至 ${postponedTo}` : updatedTask.goal || ""),
      },
    })

    return updatedTask
  })
  if (!task) {
    return NextResponse.json(
      { success: false, error: { code: "CONCURRENT_UPDATE", message: "任务状态已更新，请刷新后重试" } },
      { status: 409 }
    )
  }

  return NextResponse.json({ success: true, data: task })
}
