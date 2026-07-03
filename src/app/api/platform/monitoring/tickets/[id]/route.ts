import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const updateTicketSchema = z.object({
  status: z.enum(["pending", "processing", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  assigneeId: z.string().nullable().optional(),
  subject: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
})

export async function GET(
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
    const ticket = await prisma.ticket.findUnique({
      where: { id },
    })

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "工单不存在" } },
        { status: 404 }
      )
    }

    const messages = await prisma.ticketMessage.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...ticket,
        messages,
      },
    })
  } catch (error) {
    console.error("获取工单详情失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取工单详情失败" } },
      { status: 500 }
    )
  }
}

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
    const result = updateTicketSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } },
        { status: 400 }
      )
    }

    const existing = await prisma.ticket.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "工单不存在" } },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = { ...result.data }

    if (result.data.status === "closed" && existing.status !== "closed") {
      updateData.closedAt = new Date()
    }

    if (result.data.status && result.data.status !== "closed" && existing.status === "closed") {
      updateData.closedAt = null
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: ticket })
  } catch (error) {
    console.error("更新工单失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "更新工单失败" } },
      { status: 500 }
    )
  }
}
