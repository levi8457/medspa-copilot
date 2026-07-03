import { NextRequest, NextResponse } from "next/server"
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
    const customerId = searchParams.get("customerId")

    const where: any = { orgId, consultantId }
    if (customerId) {
      where.customerId = customerId
    }

    const recommendations = await prisma.projectRecommendation.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, status: true, tier: true } },
        project: true,
      },
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: 20,
    })

    return NextResponse.json({
      success: true,
      data: recommendations,
    })
  } catch (error) {
    console.error("Get recommendations error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取推荐失败" } },
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
    const body = await request.json()
    const { customerId } = body

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PARAMS", message: "客户ID必填" } },
        { status: 400 }
      )
    }

    const [customer, projects, existingRecs] = await Promise.all([
      prisma.customer.findUnique({
        where: { id: customerId },
        include: { tags: true },
      }),
      prisma.project.findMany({
        where: { orgId, isActive: true },
      }),
      prisma.projectRecommendation.findMany({
        where: { customerId, status: "pending" },
      }),
    ])

    if (!customer) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "客户不存在" } },
        { status: 404 }
      )
    }

    if (existingRecs.length > 0) {
      return NextResponse.json({
        success: true,
        data: existingRecs,
      })
    }

    const customerTags = customer.tags.map((t) => `${t.dimension}:${t.value}`)
    const mockRecommendations = projects.slice(0, 3).map((project, index) => {
      const projectTags = project.tags ? JSON.parse(project.tags) : []
      const matchScore = projectTags.length > 0
        ? projectTags.filter((tag: string) =>
            customerTags.some((ct) => ct.includes(tag) || tag.includes(ct))
          ).length / projectTags.length
        : 0.3

      const baseScore = 0.5 + matchScore * 0.4 - index * 0.1
      const score = Math.min(0.95, Math.max(0.2, baseScore))

      const reasons = [
        `客户标签与项目"${project.name}"高度匹配`,
        `基于客户${customer.status === "converted" ? "已成交" : "意向"}状态推荐`,
        `${customer.tier ? customer.tier + "类客户" : "高价值客户"}优先推荐`,
      ]

      return {
        customerId,
        projectId: project.id,
        score,
        reason: reasons[index] || "AI智能推荐",
        script: `您好${customer.name}，最近我们有个${project.name}项目特别适合您的情况...`,
        conversionProb: 0.3 + score * 0.5,
      }
    })

    const created = await Promise.all(
      mockRecommendations.map((rec) =>
        prisma.projectRecommendation.create({
          data: {
            orgId,
            ...rec,
          },
          include: {
            project: true,
            customer: { select: { id: true, name: true } },
          },
        })
      )
    )

    return NextResponse.json({
      success: true,
      data: created,
    })
  } catch (error) {
    console.error("Generate recommendations error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "生成推荐失败" } },
      { status: 500 }
    )
  }
}
