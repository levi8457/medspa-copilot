import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getUserId } from "@/lib/db-tenant"

// PATCH - 审核操作
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  }

  // 只有管理员可以审核
  if (session.user.role !== "org_admin" && session.user.role !== "super_admin") {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "无权执行审核操作" } }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { action, comment, type } = body

  if (!action || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ success: false, error: { code: "INVALID_ACTION", message: "无效的审核操作" } }, { status: 400 })
  }

  const userId = getUserId(session)

  try {
    // 根据类型更新不同的表
    if (type === "sop") {
      await prisma.sopTemplate.update({
        where: { id },
        data: {
          status: action === "approve" ? "approved" : "rejected",
          reviewComment: comment,
          reviewedBy: userId,
          reviewedAt: new Date(),
          isActive: action === "approve",
        },
      })
    } else if (type === "tag") {
      // 标签审核逻辑（示例）
      // 实际应该更新 CustomerTag 的审核状态
    } else if (type === "strategy") {
      // 策略审核逻辑（示例）
      // 实际应该更新 FollowUpPlan 的审核状态
    }

    // 记录审计日志
    await prisma.auditLog.create({
      data: {
        orgId: session.user.orgId,
        userId,
        action: `review.${action}`,
        resourceType: type || "unknown",
        resourceId: id,
        newValue: JSON.stringify({ action, comment }),
      },
    })

    return NextResponse.json({
      success: true,
      data: { message: action === "approve" ? "审核通过" : "已驳回" },
    })
  } catch (error) {
    console.error("审核操作失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "审核操作失败" } },
      { status: 500 }
    )
  }
}