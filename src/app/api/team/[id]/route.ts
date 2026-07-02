import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requireApiAuth } from "@/lib/auth/rbac"
import { z } from "zod"

const updateMemberSchema = z.object({
  name: z.string().min(2, "姓名至少2个字符").optional(),
  phone: z.string().min(11, "请输入有效的手机号").optional(),
  role: z.enum(["consultant", "org_admin"]).optional(),
  isActive: z.boolean().optional(),
})

// 更新成员
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireApiAuth("org_admin")
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
      { status: 401 }
    )
  }

  try {
    const { id } = await params

    // 校验成员归属当前机构
    const existing = await prisma.user.findFirst({
      where: { id, orgId: session.user.orgId },
    })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "成员不存在" } },
        { status: 404 }
      )
    }

    const body = await request.json()
    const result = updateMemberSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } },
        { status: 400 }
      )
    }

    // 手机号唯一性校验
    if (result.data.phone && result.data.phone !== existing.phone) {
      const duplicate = await prisma.user.findFirst({
        where: { phone: result.data.phone, NOT: { id } },
      })
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: { code: "USER_EXISTS", message: "该手机号已被使用" } },
          { status: 400 }
        )
      }
    }

    const { name, phone, role, isActive } = result.data

    // 同步 email 前缀（保持与 POST 路由一致：phone@org.local）
    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (phone !== undefined) {
      data.phone = phone
      data.email = `${phone}@${session.user.orgId.slice(0, 8)}.local`
    }
    if (role !== undefined) data.role = role
    if (isActive !== undefined) data.isActive = isActive

    const oldValue = JSON.stringify({
      name: existing.name,
      phone: existing.phone,
      role: existing.role,
      isActive: existing.isActive,
    })

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, phone: true, role: true, isActive: true },
    })

    // 审计日志
    await prisma.auditLog.create({
      data: {
        orgId: session.user.orgId,
        userId: session.user.id,
        action: "team.member.update",
        resourceType: "User",
        resourceId: id,
        oldValue,
        newValue: JSON.stringify({
          name: updated.name,
          phone: updated.phone,
          role: updated.role,
          isActive: updated.isActive,
        }),
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("更新成员失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "更新失败，请稍后重试" } },
      { status: 500 }
    )
  }
}

// 删除成员
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireApiAuth("org_admin")
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
      { status: 401 }
    )
  }

  try {
    const { id } = await params

    // 校验成员归属当前机构
    const existing = await prisma.user.findFirst({
      where: { id, orgId: session.user.orgId },
      select: { id: true, name: true, phone: true, role: true, isActive: true },
    })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "成员不存在" } },
        { status: 404 }
      )
    }

    // 禁止删除自身
    if (id === session.user.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "不能删除当前登录账号" } },
        { status: 400 }
      )
    }

    // 审计日志（先写再删，避免外键约束问题）
    await prisma.auditLog.create({
      data: {
        orgId: session.user.orgId,
        userId: session.user.id,
        action: "team.member.delete",
        resourceType: "User",
        resourceId: id,
        oldValue: JSON.stringify(existing),
      },
    })

    await prisma.user.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error("删除成员失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "删除失败，请稍后重试" } },
      { status: 500 }
    )
  }
}
