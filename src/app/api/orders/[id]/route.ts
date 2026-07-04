import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 获取订单详情（含支付信息），校验 orgId 归属
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role === "consultant") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "无权操作" } },
        { status: 403 }
      )
    }

    const { id } = await params
    const orgId = session.user.orgId

    const order = await prisma.order.findFirst({
      where: { id, orgId },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            description: true,
            maxSeats: true,
            priceMonthly: true,
            priceYearly: true,
          },
        },
        payments: { orderBy: { createdAt: "desc" } },
      },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "订单不存在或无权访问" } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        planId: order.planId,
        planName: order.plan.name,
        planDescription: order.plan.description,
        type: order.type,
        amount: order.amount,
        period: order.period,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentNo: order.paymentNo,
        note: order.note,
        paidAt: order.paidAt?.toISOString() ?? null,
        paidBy: order.paidBy,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        plan: order.plan,
        payments: order.payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          method: p.method,
          status: p.status,
          transactionNo: p.transactionNo,
          paidAt: p.paidAt?.toISOString() ?? null,
          createdAt: p.createdAt.toISOString(),
        })),
      },
    })
  } catch (error) {
    console.error("获取订单详情失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取订单详情失败" } },
      { status: 500 }
    )
  }
}
