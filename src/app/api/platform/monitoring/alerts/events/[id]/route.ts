import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const updateEventSchema = z.object({
  status: z.enum(["pending", "acknowledged", "resolved", "ignored"]),
  resolvedNote: z.string().optional(),
})

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
    const result = updateEventSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } },
        { status: 400 }
      )
    }

    const existing = await prisma.alertEvent.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "告警事件不存在" } },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {
      status: result.data.status,
    }

    if (result.data.status === "acknowledged" && existing.status !== "acknowledged") {
      updateData.acknowledgedBy = session.user.id
    }

    if (result.data.status === "resolved") {
      updateData.resolvedBy = session.user.id
      updateData.resolvedAt = new Date()
      if (result.data.resolvedNote) {
        updateData.resolvedNote = result.data.resolvedNote
      }
    }

    const event = await prisma.alertEvent.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: event })
  } catch (error) {
    console.error("更新告警事件失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "更新告警事件失败" } },
      { status: 500 }
    )
  }
}
