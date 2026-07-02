import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"

const createPlanSchema = z.object({
  name: z.string().min(1, "套餐名称不能为空"),
  description: z.string().optional(),
  maxSeats: z.number().int().min(1, "席位数至少为1"),
  maxRecordingHours: z.number().int().min(0),
  maxAiCalls: z.number().int().min(0),
  maxStorage: z.number().int().min(0),
  priceMonthly: z.number().min(0),
  priceYearly: z.number().min(0),
  trialDays: z.number().int().min(0),
  sortOrder: z.number().int().optional(),
})

// 获取套餐列表
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

    const where: Record<string, unknown> = {}
    if (isActive !== null) {
      where.isActive = isActive === "true"
    }

    const plans = await prisma.plan.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    })

    return NextResponse.json({ success: true, data: plans })
  } catch (error) {
    console.error("获取套餐列表失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取套餐列表失败" } },
      { status: 500 }
    )
  }
}

// 创建套餐
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
    const result = createPlanSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } },
        { status: 400 }
      )
    }

    const plan = await prisma.plan.create({ data: result.data })

    return NextResponse.json({ success: true, data: plan }, { status: 201 })
  } catch (error) {
    console.error("创建套餐失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "创建套餐失败" } },
      { status: 500 }
    )
  }
}
