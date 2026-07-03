import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/db"

const VALID_TYPES = ["post_visit", "service_review", "nps"] as const
type SurveyType = (typeof VALID_TYPES)[number]

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role === "consultant") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "无权访问" } },
        { status: 403 }
      )
    }

    const orgId = session.user.orgId
    const { searchParams } = new URL(request.url)
    const typeFilter = searchParams.get("type")
    const ratingFilter = searchParams.get("rating")

    const where: Record<string, unknown> = { orgId }
    if (typeFilter && VALID_TYPES.includes(typeFilter as SurveyType)) {
      where.type = typeFilter
    }
    if (ratingFilter === "good") {
      where.rating = { gte: 4 }
    } else if (ratingFilter === "bad") {
      where.rating = { lte: 3 }
    }

    const surveys = await prisma.satisfactionSurvey.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    })

    const customerIds = [...new Set(surveys.map((s) => s.customerId))]
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true },
    })
    const customerMap = Object.fromEntries(customers.map((c) => [c.id, c.name]))

    const total = surveys.length
    const completed = surveys.filter((s) => s.status === "completed").length
    const ratedSurveys = surveys.filter((s) => s.rating != null)
    const avgRating =
      ratedSurveys.length > 0
        ? Math.round((ratedSurveys.reduce((sum, s) => sum + (s.rating || 0), 0) / ratedSurveys.length) * 10) / 10
        : 0
    const badCount = surveys.filter((s) => s.rating != null && s.rating <= 3).length
    const completionRate = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0

    const distribution = [1, 2, 3, 4, 5].map((star) => ({
      star,
      count: surveys.filter((s) => s.rating === star).length,
    }))

    const list = surveys.map((s) => ({
      id: s.id,
      customerId: s.customerId,
      customerName: customerMap[s.customerId] || "未知客户",
      consultantId: s.consultantId,
      type: s.type,
      rating: s.rating,
      feedback: s.feedback,
      npsScore: s.npsScore,
      status: s.status,
      triggeredAt: s.triggeredAt.toISOString(),
      completedAt: s.completedAt?.toISOString() || null,
      createdAt: s.createdAt.toISOString(),
    }))

    return NextResponse.json({
      success: true,
      data: {
        stats: { total, completed, avgRating, badCount, completionRate },
        distribution,
        list,
      },
    })
  } catch (error) {
    console.error("获取满意度调研数据失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取满意度调研数据失败" } },
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

    const orgId = session.user.orgId
    const body = await request.json()
    const { customerId, consultantId, type, rating, dimensions, feedback, npsScore } = body as {
      customerId?: string
      consultantId?: string | null
      type?: string
      rating?: number | null
      dimensions?: string | null
      feedback?: string | null
      npsScore?: number | null
    }

    if (!customerId || !type) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "客户ID和调研类型为必填项" } },
        { status: 400 }
      )
    }

    if (!VALID_TYPES.includes(type as SurveyType)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "调研类型无效" } },
        { status: 400 }
      )
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, orgId },
      select: { id: true, consultantId: true },
    })
    if (!customer) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "客户不存在或无权操作" } },
        { status: 404 }
      )
    }

    const survey = await prisma.satisfactionSurvey.create({
      data: {
        orgId,
        customerId,
        consultantId: consultantId || customer.consultantId || null,
        type,
        rating: typeof rating === "number" ? rating : null,
        dimensions: dimensions || null,
        feedback: feedback || null,
        npsScore: typeof npsScore === "number" ? npsScore : null,
        status: "pending",
      },
    })

    return NextResponse.json({ success: true, data: { id: survey.id } })
  } catch (error) {
    console.error("创建满意度调研失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "创建满意度调研失败" } },
      { status: 500 }
    )
  }
}
