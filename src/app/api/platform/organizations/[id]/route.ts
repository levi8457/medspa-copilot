import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"

const updateOrgSchema = z.object({
  name: z.string().min(2, "机构名称至少2个字符").optional(),
  isActive: z.boolean().optional(),
  action: z.enum(["suspend", "resume"]).optional(),
})

// 获取机构详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "无权限访问" } },
        { status: 403 }
      )
    }

    const { id } = await params

    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
        orders: {
          include: { plan: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    })

    if (!org) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "机构不存在" } },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: org })
  } catch (error) {
    console.error("获取机构详情失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取机构详情失败" } },
      { status: 500 }
    )
  }
}

// 更新机构（含暂停/恢复）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "无权限访问" } },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const result = updateOrgSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } },
        { status: 400 }
      )
    }

    const org = await prisma.organization.findUnique({ where: { id } })
    if (!org) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "机构不存在" } },
        { status: 404 }
      )
    }

    const { name, isActive, action } = result.data
    const data: Record<string, unknown> = {}
    if (name) data.name = name
    if (action === "suspend") data.isActive = false
    if (action === "resume") data.isActive = true
    if (typeof isActive === "boolean") data.isActive = isActive

    const updated = await prisma.organization.update({
      where: { id },
      data,
    })

    // 敏感操作写入审计日志
    const isSuspending =
      action === "suspend" || (typeof isActive === "boolean" && !isActive)
    const isResuming =
      action === "resume" || (typeof isActive === "boolean" && isActive)

    if (isSuspending || isResuming) {
      await prisma.auditLog.create({
        data: {
          orgId: id,
          userId: session.user.id,
          action: isSuspending ? "organization.suspend" : "organization.resume",
          resourceType: "Organization",
          resourceId: id,
          oldValue: JSON.stringify({ isActive: org.isActive }),
          newValue: JSON.stringify({ isActive: updated.isActive }),
        },
      })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("更新机构失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "更新机构失败" } },
      { status: 500 }
    )
  }
}
