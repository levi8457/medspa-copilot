import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"

const createOrderSchema = z.object({
  orgId: z.string().min(1, "请选择机构"),
  planId: z.string().min(1, "请选择套餐"),
  type: z.enum(["new", "renew", "upgrade"]),
  period: z.enum(["monthly", "yearly"]),
  amount: z.number().min(0, "金额不能为负"),
  paymentMethod: z.string().optional(),
  note: z.string().optional(),
})

// 获取订单列表
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
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")
    const orgId = searchParams.get("orgId")
    const status = searchParams.get("status")

    const where: Record<string, unknown> = {}
    if (orgId) where.orgId = orgId
    if (status) where.status = status

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          organization: { select: { id: true, name: true } },
          plan: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        orders,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    })
  } catch (error) {
    console.error("获取订单列表失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取订单列表失败" } },
      { status: 500 }
    )
  }
}

// 手动创建订单
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
    const result = createOrderSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } },
        { status: 400 }
      )
    }

    const { orgId, planId, type, period, amount, paymentMethod, note } = result.data

    // 校验机构与套餐存在
    const [org, plan] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.plan.findUnique({ where: { id: planId } }),
    ])
    if (!org) {
      return NextResponse.json(
        { success: false, error: { code: "ORG_NOT_FOUND", message: "机构不存在" } },
        { status: 404 }
      )
    }
    if (!plan) {
      return NextResponse.json(
        { success: false, error: { code: "PLAN_NOT_FOUND", message: "套餐不存在" } },
        { status: 404 }
      )
    }

    const order = await prisma.order.create({
      data: {
        orgId,
        planId,
        type,
        period,
        amount,
        paymentMethod,
        note,
        status: "pending",
      },
    })

    return NextResponse.json({ success: true, data: order }, { status: 201 })
  } catch (error) {
    console.error("创建订单失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "创建订单失败" } },
      { status: 500 }
    )
  }
}
