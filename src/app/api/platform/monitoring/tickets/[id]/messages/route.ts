import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const createMessageSchema = z.object({
  content: z.string().min(1, "回复内容不能为空"),
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

    const ticket = await prisma.ticket.findUnique({ where: { id } })
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

    return NextResponse.json({ success: true, data: messages })
  } catch (error) {
    console.error("获取工单消息失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取工单消息失败" } },
      { status: 500 }
    )
  }
}

export async function POST(
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
    const result = createMessageSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } },
        { status: 400 }
      )
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } })
    if (!ticket) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "工单不存在" } },
        { status: 404 }
      )
    }

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        senderId: session.user.id,
        senderRole: "super_admin",
        content: result.data.content,
      },
    })

    if (ticket.status === "pending") {
      await prisma.ticket.update({
        where: { id },
        data: { status: "processing" },
      })
    }

    return NextResponse.json({ success: true, data: message }, { status: 201 })
  } catch (error) {
    console.error("发送工单消息失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "发送工单消息失败" } },
      { status: 500 }
    )
  }
}
