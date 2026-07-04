import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const ORDER_TYPES = ["new", "renew", "upgrade"] as const
const PERIODS = ["monthly", "yearly"] as const
const PAYMENT_METHODS = ["wechat", "alipay", "offline"] as const

const createOrderSchema = z.object({
  planId: z.string().min(1, "请选择套餐"),
  type: z.enum(ORDER_TYPES, { message: "订单类型无效" }),
  period: z.enum(PERIODS, { message: "订阅周期无效" }),
  paymentMethod: z.enum(PAYMENT_METHODS, { message: "支付方式无效" }),
})

// 获取当前机构的订单列表（含当前订阅信息）
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role === "consultant") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "无权操作" } },
        { status: 403 }
      )
    }

    const orgId = session.user.orgId
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")

    const where: Record<string, unknown> = { orgId }
    if (status) where.status = status

    const [orders, total, currentSubscription] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          plan: { select: { id: true, name: true, priceMonthly: true, priceYearly: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
      prisma.subscription.findFirst({
        where: { orgId },
        include: { plan: { select: { id: true, name: true, maxSeats: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        orders: orders.map((o) => ({
          id: o.id,
          planId: o.planId,
          planName: o.plan.name,
          type: o.type,
          amount: o.amount,
          period: o.period,
          status: o.status,
          paymentMethod: o.paymentMethod,
          paymentNo: o.paymentNo,
          paidAt: o.paidAt?.toISOString() ?? null,
          createdAt: o.createdAt.toISOString(),
          updatedAt: o.updatedAt.toISOString(),
        })),
        currentSubscription: currentSubscription
          ? {
              id: currentSubscription.id,
              planId: currentSubscription.planId,
              planName: currentSubscription.plan.name,
              status: currentSubscription.status,
              seatsUsed: currentSubscription.seatsUsed,
              seatsLimit: currentSubscription.seatsLimit,
              startsAt: currentSubscription.startsAt.toISOString(),
              endsAt: currentSubscription.endsAt?.toISOString() ?? null,
              trialEndsAt: currentSubscription.trialEndsAt?.toISOString() ?? null,
            }
          : null,
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

// 创建订单（自动计算金额，同时创建待支付 Payment 记录）
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role === "consultant") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "无权操作" } },
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

    const { planId, type, period, paymentMethod } = result.data
    const orgId = session.user.orgId

    const plan = await prisma.plan.findUnique({ where: { id: planId } })
    if (!plan || !plan.isActive) {
      return NextResponse.json(
        { success: false, error: { code: "PLAN_NOT_FOUND", message: "套餐不存在或已停用" } },
        { status: 404 }
      )
    }

    const amount = period === "monthly" ? plan.priceMonthly : plan.priceYearly

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orgId,
          planId,
          type,
          amount,
          period,
          status: "pending",
          paymentMethod,
        },
      })

      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          amount,
          method: paymentMethod,
          status: "pending",
        },
      })

      await tx.auditLog.create({
        data: {
          orgId,
          userId: session.user.id,
          action: "order.create",
          resourceType: "Order",
          resourceId: newOrder.id,
          newValue: JSON.stringify({ planId, type, period, amount, paymentMethod }),
        },
      })

      return newOrder
    })

    const orderWithPlan = await prisma.order.findUnique({
      where: { id: order.id },
      include: { plan: { select: { id: true, name: true } } },
    })

    return NextResponse.json(
      {
        success: true,
        data: orderWithPlan
          ? {
              id: orderWithPlan.id,
              planId: orderWithPlan.planId,
              planName: orderWithPlan.plan.name,
              type: orderWithPlan.type,
              amount: orderWithPlan.amount,
              period: orderWithPlan.period,
              status: orderWithPlan.status,
              paymentMethod: orderWithPlan.paymentMethod,
              createdAt: orderWithPlan.createdAt.toISOString(),
            }
          : null,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("创建订单失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "创建订单失败" } },
      { status: 500 }
    )
  }
}
