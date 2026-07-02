import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"

const createRuleSchema = z.object({
  name: z.string().min(1, "规则名称不能为空"),
  type: z.enum(["round_robin", "load_balanced", "manual", "rule_based"]),
  priority: z.number().int().optional(),
  config: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role === "consultant") {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "无权操作" } }, { status: 403 })
    }

    const rules = await prisma.leadAssignmentRule.findMany({
      where: { orgId: session.user.orgId },
      orderBy: { priority: "desc" },
    })

    return NextResponse.json({ success: true, data: rules })
  } catch (error) {
    console.error("获取分配规则失败:", error)
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "获取分配规则失败" } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role === "consultant") {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "无权操作" } }, { status: 403 })
    }

    const body = await request.json()
    const result = createRuleSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } }, { status: 400 })
    }

    const rule = await prisma.leadAssignmentRule.create({
      data: {
        orgId: session.user.orgId,
        ...result.data,
      },
    })

    return NextResponse.json({ success: true, data: rule })
  } catch (error) {
    console.error("创建分配规则失败:", error)
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "创建分配规则失败" } }, { status: 500 })
  }
}