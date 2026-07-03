import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const createRuleSchema = z.object({
  name: z.string().min(1, "规则名称不能为空"),
  metric: z.string().min(1, "监控指标不能为空"),
  condition: z.enum(["greater_than", "less_than"]),
  threshold: z.number(),
  severity: z.enum(["info", "warning", "critical"]),
  notifyChannel: z.enum(["site", "sms", "email"]),
  isActive: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "无权限访问" } },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get("isActive")
    const metric = searchParams.get("metric")
    const severity = searchParams.get("severity")

    const where: Record<string, unknown> = {}
    if (isActive !== null) {
      where.isActive = isActive === "true"
    }
    if (metric) {
      where.metric = metric
    }
    if (severity) {
      where.severity = severity
    }

    const rules = await prisma.alertRule.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ success: true, data: rules })
  } catch (error) {
    console.error("获取告警规则列表失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取告警规则列表失败" } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "无权限访问" } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const result = createRuleSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } },
        { status: 400 }
      )
    }

    const rule = await prisma.alertRule.create({ data: result.data })

    return NextResponse.json({ success: true, data: rule }, { status: 201 })
  } catch (error) {
    console.error("创建告警规则失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "创建告警规则失败" } },
      { status: 500 }
    )
  }
}
