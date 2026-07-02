import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"

const updateOrderSchema = z.object({
  status: z.enum(["pending", "paid", "cancelled", "refunded"]),
  paymentMethod: z.string().optional(),
  transactionNo: z.string().optional(),
  note: z.string().optional(),
})

// 获取订单详情（含支付记录）
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
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true } },
        plan: true,
        payments: { orderBy: { createdAt: "desc" } },
      },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "订单不存在" } },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: order })
  } catch (error) {
    console.error("获取订单详情失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取订单详情失败" } },
      { status: 500 }
    )
  }
}

// 更新订单状态（支付时创建 Payment 记录）
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
    const result = updateOrderSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } },
        { status: 400 }
      )
    }

    const { status, paymentMethod, transactionNo, note } = result.data

    const existing = await prisma.order.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "订单不存在" } },
        { status: 404 }
      )
    }

    const now = new Date()

    const updated = await prisma.$transaction(async (tx) => {
      const data: Record<string, unknown> = { status }
      if (paymentMethod) data.paymentMethod = paymentMethod
      if (transactionNo) data.paymentNo = transactionNo
      if (note !== undefined) data.note = note

      if (status === "paid") {
        data.paidAt = now
        data.paidBy = session.user.id
      }

      const order = await tx.order.update({
        where: { id },
        data,
      })

      // 支付成功：创建支付记录 + 审计日志
      if (status === "paid") {
        await tx.payment.create({
          data: {
            orderId: id,
            amount: existing.amount,
            method: paymentMethod || "offline",
            status: "success",
            transactionNo,
            paidAt: now,
          },
        })

        await tx.auditLog.create({
          data: {
            orgId: existing.orgId,
            userId: session.user.id,
            action: "order.payment",
            resourceType: "Order",
            resourceId: id,
            oldValue: JSON.stringify({ status: existing.status }),
            newValue: JSON.stringify({
              status,
              amount: existing.amount,
              method: paymentMethod,
            }),
          },
        })
      }

      return order
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("更新订单失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "更新订单失败" } },
      { status: 500 }
    )
  }
}
