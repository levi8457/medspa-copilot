import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"

const CAMPAIGN_TYPES = ["coupon", "experience", "referral", "festival"] as const

const createCampaignSchema = z.object({
  name: z.string().min(1, "活动名称不能为空"),
  type: z.enum(CAMPAIGN_TYPES, { message: "活动类型无效" }),
  startDate: z.string().min(1, "开始时间不能为空"),
  endDate: z.string().min(1, "结束时间不能为空"),
  budget: z.number().min(0).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
})

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
    const type = searchParams.get("type")

    const where: Record<string, unknown> = { orgId }
    if (status) {
      where.status = status
    }
    if (type) {
      where.type = type
    }

    const [campaigns, total, activeCount, totalParticipants, totalUsed] = await Promise.all([
      prisma.marketingCampaign.findMany({
        where,
        include: {
          participants: {
            select: { id: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.marketingCampaign.count({ where: { orgId } }),
      prisma.marketingCampaign.count({ where: { orgId, status: "active" } }),
      prisma.campaignParticipant.count({ where: { orgId } }),
      prisma.campaignParticipant.count({ where: { orgId, status: "used" } }),
    ])

    const verificationRate = totalParticipants > 0 ? (totalUsed / totalParticipants) * 100 : 0

    return NextResponse.json({
      success: true,
      data: {
        campaigns: campaigns.map((c) => {
          const participants = c.participants.length
          const used = c.participants.filter((p) => p.status === "used").length
          return {
            id: c.id,
            name: c.name,
            type: c.type,
            status: c.status,
            config: c.config,
            startDate: c.startDate.toISOString(),
            endDate: c.endDate.toISOString(),
            budget: c.budget,
            isActive: c.isActive,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
            participants,
            used,
            verificationRate: participants > 0 ? (used / participants) * 100 : 0,
          }
        }),
        stats: {
          total,
          active: activeCount,
          totalParticipants,
          verificationRate: Math.round(verificationRate * 100) / 100,
        },
      },
    })
  } catch (error) {
    console.error("获取营销活动列表失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取营销活动列表失败" } },
      { status: 500 }
    )
  }
}

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
    const result = createCampaignSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } },
        { status: 400 }
      )
    }

    const { name, type, startDate, endDate, budget, config } = result.data

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "时间格式无效" } },
        { status: 400 }
      )
    }

    if (end <= start) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "结束时间必须晚于开始时间" } },
        { status: 400 }
      )
    }

    const campaign = await prisma.marketingCampaign.create({
      data: {
        orgId: session.user.orgId,
        name,
        type,
        status: "draft",
        startDate: start,
        endDate: end,
        budget: budget ?? null,
        config: config ? JSON.stringify(config) : null,
      },
    })

    return NextResponse.json({ success: true, data: campaign })
  } catch (error) {
    console.error("创建营销活动失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "创建营销活动失败" } },
      { status: 500 }
    )
  }
}
