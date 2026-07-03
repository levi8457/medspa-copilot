import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"

const CAMPAIGN_TYPES = ["coupon", "experience", "referral", "festival"] as const
const CAMPAIGN_STATUSES = ["draft", "active", "paused", "ended"] as const

const updateCampaignSchema = z.object({
  name: z.string().min(1, "活动名称不能为空").optional(),
  type: z.enum(CAMPAIGN_TYPES, { message: "活动类型无效" }).optional(),
  status: z.enum(CAMPAIGN_STATUSES, { message: "活动状态无效" }).optional(),
  startDate: z.string().min(1, "开始时间不能为空").optional(),
  endDate: z.string().min(1, "结束时间不能为空").optional(),
  budget: z.number().min(0).nullable().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
})

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

    const campaign = await prisma.marketingCampaign.findFirst({
      where: { id, orgId: session.user.orgId },
      include: {
        participants: {
          select: { id: true, status: true, customerId: true, consultantId: true, issuedAt: true, usedAt: true, notes: true },
          orderBy: { issuedAt: "desc" },
        },
      },
    })

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "活动不存在或无权访问" } },
        { status: 404 }
      )
    }

    const participants = campaign.participants.length
    const used = campaign.participants.filter((p) => p.status === "used").length

    return NextResponse.json({
      success: true,
      data: {
        ...campaign,
        startDate: campaign.startDate.toISOString(),
        endDate: campaign.endDate.toISOString(),
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString(),
        participants,
        used,
        verificationRate: participants > 0 ? (used / participants) * 100 : 0,
      },
    })
  } catch (error) {
    console.error("获取活动详情失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取活动详情失败" } },
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
    if (!session || session.user.role === "consultant") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "无权操作" } },
        { status: 403 }
      )
    }

    const { id } = await params

    const existing = await prisma.marketingCampaign.findFirst({
      where: { id, orgId: session.user.orgId },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "活动不存在或无权访问" } },
        { status: 404 }
      )
    }

    const body = await request.json()
    const result = updateCampaignSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } },
        { status: 400 }
      )
    }

    const { startDate, endDate, config, ...rest } = result.data

    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      if (end <= start) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: "结束时间必须晚于开始时间" } },
          { status: 400 }
        )
      }
    }

    const data: Record<string, unknown> = { ...rest }
    if (startDate) data.startDate = new Date(startDate)
    if (endDate) data.endDate = new Date(endDate)
    if (config !== undefined) data.config = config ? JSON.stringify(config) : null

    const campaign = await prisma.marketingCampaign.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: campaign })
  } catch (error) {
    console.error("更新营销活动失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "更新营销活动失败" } },
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
    if (!session || session.user.role === "consultant") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "无权操作" } },
        { status: 403 }
      )
    }

    const { id } = await params

    const existing = await prisma.marketingCampaign.findFirst({
      where: { id, orgId: session.user.orgId },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "活动不存在或无权访问" } },
        { status: 404 }
      )
    }

    await prisma.marketingCampaign.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error("删除营销活动失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "删除营销活动失败" } },
      { status: 500 }
    )
  }
}