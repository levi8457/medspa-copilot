import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role === "consultant") {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "无权操作" } }, { status: 403 })
    }

    const orgId = session.user.orgId
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const status = searchParams.get("status")

    const where: Record<string, unknown> = { orgId }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ]
    }
    if (status) {
      where.status = status
    }

    const [leads, total, unassigned, todayNew] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          tags: { select: { dimension: true, value: true }, take: 5 },
          consultant: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.customer.count({ where: { orgId } }),
      prisma.customer.count({ where: { orgId, consultantId: null } }),
      prisma.customer.count({
        where: {
          orgId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ])

    const avgResponseTime = 0

    return NextResponse.json({
      success: true,
      data: {
        leads: leads.map((l) => ({
          id: l.id,
          name: l.name,
          phone: l.phone || "",
          wechat: l.wechat || "",
          status: l.status,
          source: l.source || "",
          consultantName: l.consultant?.name || "",
          createdAt: l.createdAt.toISOString(),
          tags: l.tags,
        })),
        stats: {
          total: total,
          unassigned: unassigned,
          todayNew: todayNew,
          avgResponseTime: avgResponseTime,
        },
      },
    })
  } catch (error) {
    console.error("获取线索数据失败:", error)
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "获取线索数据失败" } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role === "consultant") {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "无权操作" } }, { status: 403 })
    }

    const body = await request.json()
    const { name, phone, wechat, source, consultantId } = body

    if (!name) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "姓名不能为空" } }, { status: 400 })
    }

    const customer = await prisma.customer.create({
      data: {
        orgId: session.user.orgId,
        name,
        phone,
        wechat,
        source,
        consultantId: consultantId || null,
        status: "lead",
      },
    })

    return NextResponse.json({ success: true, data: customer })
  } catch (error) {
    console.error("创建线索失败:", error)
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "创建线索失败" } }, { status: 500 })
  }
}