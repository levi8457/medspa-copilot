import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"

const updatePlanSchema = z.object({
  name: z.string().min(1, "套餐名称不能为空").optional(),
  description: z.string().optional(),
  maxSeats: z.number().int().min(1).optional(),
  maxRecordingHours: z.number().int().min(0).optional(),
  maxAiCalls: z.number().int().min(0).optional(),
  maxStorage: z.number().int().min(0).optional(),
  priceMonthly: z.number().min(0).optional(),
  priceYearly: z.number().min(0).optional(),
  trialDays: z.number().int().min(0).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

// 获取套餐详情
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
    const plan = await prisma.plan.findUnique({
      where: { id },
      include: {
        _count: {
          select: { subscriptions: true, orders: true },
        },
      },
    })

    if (!plan) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "套餐不存在" } },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: plan })
  } catch (error) {
    console.error("获取套餐详情失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取套餐详情失败" } },
      { status: 500 }
    )
  }
}

// 更新套餐
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
    const result = updatePlanSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } },
        { status: 400 }
      )
    }

    const plan = await prisma.plan.update({
      where: { id },
      data: result.data,
    })

    return NextResponse.json({ success: true, data: plan })
  } catch (error) {
    console.error("更新套餐失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "更新套餐失败" } },
      { status: 500 }
    )
  }
}

// 删除套餐（软删除：置为不活跃）
export async function DELETE(
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
    await prisma.plan.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error("删除套餐失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "删除套餐失败" } },
      { status: 500 }
    )
  }
}
