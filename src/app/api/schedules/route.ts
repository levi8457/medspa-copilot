import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const orgId = session.user.orgId
    const consultantId = session.user.id
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    const status = searchParams.get("status")

    const where: Prisma.ScheduleWhereInput = { orgId, consultantId }

    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
      where.startTime = { gte: startDate, lte: endDate }
    }

    if (status) {
      where.status = status
    }

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
      },
      orderBy: { startTime: "asc" },
      take: 100,
    })

    return NextResponse.json({
      success: true,
      data: schedules,
    })
  } catch (error) {
    console.error("Get schedules error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取日程失败" } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const orgId = session.user.orgId
    const consultantId = session.user.id
    const body = await request.json()
    const { title, type, startTime, endTime, customerId, reminderMinutes, notes } = body

    if (!title || !type || !startTime) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PARAMS", message: "标题、类型和开始时间必填" } },
        { status: 400 }
      )
    }

    const schedule = await prisma.schedule.create({
      data: {
        orgId,
        consultantId,
        customerId: customerId || null,
        title,
        type,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        reminderMinutes: reminderMinutes || null,
        notes: notes || null,
      },
      include: {
        customer: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: schedule,
    })
  } catch (error) {
    console.error("Create schedule error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "创建日程失败" } },
      { status: 500 }
    )
  }
}
