import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 生成 Mock 流水号
function generateTransactionNo(): string {
  const ts = Date.now().toString()
  const rand = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0")
  return `MOCK${ts}${rand}`
}

// Mock 支付：模拟支付成功，更新订单/支付/订阅
export async function POST(
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
      include: { plan: true, payments: { orderBy: { createdAt: "desc" } } },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "订单不存在或无权访问" } },
        { status: 404 }
      )
    }

    if (order.status === "paid") {
      return NextResponse.json(
        { success: false, error: { code: "ALREADY_PAID", message: "订单已支付" } },
        { status: 400 }
      )
    }

    if (order.status === "cancelled" || order.status === "refunded") {
      return NextResponse.json(
        { success: false, error: { code: "ORDER_CLOSED", message: `订单已${order.status === "cancelled" ? "取消" : "退款"}，无法支付` } },
        { status: 400 }
      )
    }

    const now = new Date()
    const transactionNo = generateTransactionNo()
    const paymentMethod = order.paymentMethod || "offline"

    const result = await prisma.$transaction(async (tx) => {
      // 更新订单状态
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status: "paid",
          paidAt: now,
          paidBy: session.user.id,
          paymentNo: transactionNo,
        },
      })

      // 更新或创建支付记录
      const latestPayment = order.payments[0]
      if (latestPayment) {
        await tx.payment.update({
          where: { id: latestPayment.id },
          data: {
            status: "success",
            transactionNo,
            paidAt: now,
            rawResponse: JSON.stringify({
              mock: true,
              method: paymentMethod,
              paidAt: now.toISOString(),
              transactionNo,
            }),
          },
        })
      } else {
        await tx.payment.create({
          data: {
            orderId: id,
            amount: order.amount,
            method: paymentMethod,
            status: "success",
            transactionNo,
            paidAt: now,
            rawResponse: JSON.stringify({
              mock: true,
              method: paymentMethod,
              paidAt: now.toISOString(),
              transactionNo,
            }),
          },
        })
      }

      // 计算新的到期时间
      const baseDate = order.period === "monthly"
        ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)

      // 更新或创建订阅
      const existingSub = await tx.subscription.findFirst({
        where: { orgId },
        orderBy: { createdAt: "desc" },
      })

      if (existingSub) {
        let newEndsAt: Date
        if (order.type === "renew" && existingSub.endsAt && existingSub.endsAt > now) {
          // 续费：在原到期日基础上延长
          newEndsAt = order.period === "monthly"
            ? new Date(existingSub.endsAt.getTime() + 30 * 24 * 60 * 60 * 1000)
            : new Date(existingSub.endsAt.getTime() + 365 * 24 * 60 * 60 * 1000)
        } else {
          // 新订/升级：从当前时间开始计算
          newEndsAt = baseDate
        }

        await tx.subscription.update({
          where: { id: existingSub.id },
          data: {
            planId: order.planId,
            status: "active",
            seatsLimit: order.plan.maxSeats,
            endsAt: newEndsAt,
          },
        })
      } else {
        await tx.subscription.create({
          data: {
            orgId,
            planId: order.planId,
            status: "active",
            seatsUsed: 0,
            seatsLimit: order.plan.maxSeats,
            startsAt: now,
            endsAt: baseDate,
          },
        })
      }

      // 审计日志
      await tx.auditLog.create({
        data: {
          orgId,
          userId: session.user.id,
          action: "order.payment",
          resourceType: "Order",
          resourceId: id,
          oldValue: JSON.stringify({ status: "pending" }),
          newValue: JSON.stringify({
            status: "paid",
            amount: order.amount,
            method: paymentMethod,
            transactionNo,
          }),
        },
      })

      return updatedOrder
    })

    return NextResponse.json({
      success: true,
      data: {
        orderId: result.id,
        status: result.status,
        transactionNo,
        paidAt: result.paidAt?.toISOString() ?? now.toISOString(),
        amount: result.amount,
      },
    })
  } catch (error) {
    console.error("支付失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "PAYMENT_FAILED", message: "支付失败，请稍后重试" } },
      { status: 500 }
    )
  }
}
