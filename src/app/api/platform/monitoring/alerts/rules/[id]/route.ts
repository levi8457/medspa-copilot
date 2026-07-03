import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const updateRuleSchema = z.object({
  name: z.string().min(1).optional(),
  metric: z.string().min(1).optional(),
  condition: z.enum(["greater_than", "less_than"]).optional(),
  threshold: z.number().optional(),
  severity: z.enum(["info", "warning", "critical"]).optional(),
  notifyChannel: z.enum(["site", "sms", "email"]).optional(),
  isActive: z.boolean().optional(),
})

export async function PUT(
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
    const result = updateRuleSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } },
        { status: 400 }
      )
    }

    const existing = await prisma.alertRule.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "告警规则不存在" } },
        { status: 404 }
      )
    }

    const rule = await prisma.alertRule.update({
      where: { id },
      data: result.data,
    })

    return NextResponse.json({ success: true, data: rule })
  } catch (error) {
    console.error("更新告警规则失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "更新告警规则失败" } },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
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
    const existing = await prisma.alertRule.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "告警规则不存在" } },
        { status: 404 }
      )
    }

    await prisma.alertRule.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error("删除告警规则失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "删除告警规则失败" } },
      { status: 500 }
    )
  }
}
