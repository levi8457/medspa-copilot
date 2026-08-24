import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { status, title, type, startTime, endTime, notes } = body

    const schedule = await prisma.schedule.findUnique({
      where: { id },
    })

    if (!schedule) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "日程不存在" } },
        { status: 404 }
      )
    }

    if (schedule.orgId !== session.user.orgId || schedule.consultantId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "无权操作" } },
        { status: 403 }
      )
    }

    const updateData: Prisma.ScheduleUpdateInput = {}
    if (status !== undefined) updateData.status = status
    if (title !== undefined) updateData.title = title
    if (type !== undefined) updateData.type = type
    if (startTime !== undefined) updateData.startTime = new Date(startTime)
    if (endTime !== undefined) updateData.endTime = endTime ? new Date(endTime) : null
    if (notes !== undefined) updateData.notes = notes

    const updated = await prisma.schedule.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    console.error("Update schedule error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "更新失败" } },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const { id } = await params

    const schedule = await prisma.schedule.findUnique({
      where: { id },
    })

    if (!schedule) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "日程不存在" } },
        { status: 404 }
      )
    }

    if (schedule.orgId !== session.user.orgId || schedule.consultantId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "无权操作" } },
        { status: 403 }
      )
    }

    await prisma.schedule.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error("Delete schedule error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "删除失败" } },
      { status: 500 }
    )
  }
}
