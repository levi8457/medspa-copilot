import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getUserId } from "@/lib/db-tenant"
import { z } from "zod"

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  comment: z.string().trim().max(2_000).optional(),
  type: z.literal("sop"),
})

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
  const parsedBody = reviewSchema.safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: parsedBody.error.issues[0].message } },
      { status: 400 }
    )
  }
  const { action, comment, type } = parsedBody.data

  const userId = getUserId(session)

  try {
    const sop = await prisma.sopTemplate.findFirst({
      where: { id, orgId: session.user.orgId, status: "submitted" },
      select: { id: true },
    })
    if (!sop) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_STATE", message: "SOP 不存在或当前不可审核" } },
        { status: 409 }
      )
    }

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
