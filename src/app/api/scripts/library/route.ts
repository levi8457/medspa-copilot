import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

const SCRIPT_CATEGORIES = [
  { key: "opening", name: "开场白", icon: "🎤" },
  { key: "objection", name: "异议处理", icon: "🛡️" },
  { key: "upsell", name: "升单话术", icon: "📈" },
  { key: "followup", name: "回访话术", icon: "📞" },
  { key: "campaign", name: "活动通知", icon: "🎉" },
  { key: "project_intro", name: "项目介绍", icon: "💉" },
  { key: "invitation", name: "邀约话术", icon: "📅" },
]

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
    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const category = searchParams.get("category")
    const scope = searchParams.get("scope") // all / org / personal

    const where: any = { orgId }

    if (scope === "org") {
      where.isOrgLevel = true
    } else if (scope === "personal") {
      where.isOrgLevel = false
      where.creatorId = userId
    } else {
      where.OR = [
        { isOrgLevel: true },
        { isOrgLevel: false, creatorId: userId },
      ]
    }

    if (category) {
      where.category = category
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ]
    }

    const [scripts, stats] = await Promise.all([
      prisma.scriptLibrary.findMany({
        where,
        orderBy: [{ isOrgLevel: "desc" }, { useCount: "desc" }, { createdAt: "desc" }],
        take: 100,
      }),
      prisma.scriptLibrary.groupBy({
        by: ["category"],
        where: {
          orgId,
          OR: [
            { isOrgLevel: true },
            { isOrgLevel: false, creatorId: userId },
          ],
        },
        _count: true,
      }),
    ])

    const categoryStats = SCRIPT_CATEGORIES.map((cat) => {
      const stat = stats.find((s) => s.category === cat.key)
      return { ...cat, count: stat?._count || 0 }
    })

    return NextResponse.json({
      success: true,
      data: {
        scripts,
        categories: categoryStats,
      },
    })
  } catch (error) {
    console.error("Get scripts error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取话术列表失败" } },
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
    const userId = session.user.id
    const body = await request.json()
    const { title, content, category, tags, isOrgLevel } = body

    if (!title || !content || !category) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PARAMS", message: "标题、内容和分类必填" } },
        { status: 400 }
      )
    }

    const canCreateOrgLevel = session.user.role === "org_admin" || session.user.role === "super_admin"
    const finalIsOrgLevel = canCreateOrgLevel && isOrgLevel

    const script = await prisma.scriptLibrary.create({
      data: {
        orgId,
        creatorId: userId,
        title,
        content,
        category,
        tags: tags ? JSON.stringify(tags) : null,
        isOrgLevel: finalIsOrgLevel,
      },
    })

    return NextResponse.json({
      success: true,
      data: script,
    })
  } catch (error) {
    console.error("Create script error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "创建话术失败" } },
      { status: 500 }
    )
  }
}
