import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { validateResourceOwnership, getUserId } from "@/lib/db-tenant"
import { z } from "zod"

const updateSopSchema = z.object({
  name: z.string().min(1, "SOP 名称不能为空").optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  stages: z.string().min(1, "SOP 阶段不能为空").optional(),
  action: z.enum(["submit"]).optional(),
})

// GET - 获取单个 SOP 详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  }

  const { id } = await params

  const hasAccess = await validateResourceOwnership("SopTemplate", id, session)
  if (!hasAccess) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "无权访问此 SOP" } }, { status: 403 })
  }

  const sop = await prisma.sopTemplate.findUnique({
    where: { id },
  })

  if (!sop) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "SOP 不存在" } }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: sop })
}

// PATCH - 更新 SOP
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  }

  const { id } = await params

  const hasAccess = await validateResourceOwnership("SopTemplate", id, session)
  if (!hasAccess) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "无权修改此 SOP" } }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsedBody = updateSopSchema.safeParse(body)
    if (!parsedBody.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsedBody.error.issues[0].message } },
        { status: 400 }
      )
    }
    const { name, description, category, stages, action } = parsedBody.data

    const existingSop = await prisma.sopTemplate.findUnique({ where: { id } })
    if (!existingSop) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "SOP 不存在" } },
        { status: 404 }
      )
    }

    const canEdit = existingSop.status === "draft" || existingSop.status === "rejected"
    if (!canEdit) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_STATE", message: "已提交或已启用的 SOP 不可直接修改" } },
        { status: 409 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (stages !== undefined) updateData.stages = stages
    if (action === "submit") {
      updateData.status = "submitted"
      updateData.isActive = false
      updateData.reviewComment = null
      updateData.reviewedBy = null
      updateData.reviewedAt = null
    }

    const sop = await prisma.sopTemplate.update({
      where: { id },
      data: updateData,
    })

    // 记录审计日志
    const userId = getUserId(session)
    await prisma.auditLog.create({
      data: {
        orgId: session.user.orgId,
        userId,
        action: action === "submit" ? "sop.submit" : "sop.update",
        resourceType: "SopTemplate",
        resourceId: id,
        newValue: JSON.stringify(updateData),
      },
    })

    return NextResponse.json({ success: true, data: sop })
  } catch (error) {
    console.error("更新 SOP 失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "更新失败" } },
      { status: 500 }
    )
  }
}

// DELETE - 删除 SOP
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  }

  const { id } = await params

  const hasAccess = await validateResourceOwnership("SopTemplate", id, session)
  if (!hasAccess) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "无权删除此 SOP" } }, { status: 403 })
  }

  const sop = await prisma.sopTemplate.findUnique({ where: { id } })
  if (!sop) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "SOP 不存在" } },
      { status: 404 }
    )
  }
  if (sop.status !== "draft" && sop.status !== "rejected") {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_STATE", message: "已提交或已启用的 SOP 不可删除" } },
      { status: 409 }
    )
  }

  await prisma.sopTemplate.delete({ where: { id } })

  // 记录审计日志
  const userId = getUserId(session)
  await prisma.auditLog.create({
    data: {
      orgId: session.user.orgId,
      userId,
      action: "sop.delete",
      resourceType: "SopTemplate",
      resourceId: id,
    },
  })

  return NextResponse.json({ success: true, data: { message: "删除成功" } })
}
