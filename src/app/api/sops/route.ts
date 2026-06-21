import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { withTenantFilter, getUserId } from "@/lib/db-tenant"

// GET - 获取 SOP 列表
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const category = searchParams.get("category")

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (category) where.category = category

  const args = withTenantFilter("SopTemplate", session, {
    where,
    orderBy: { createdAt: "desc" },
  })

  const sops = await prisma.sopTemplate.findMany(args as Parameters<typeof prisma.sopTemplate.findMany>[0])

  return NextResponse.json({ success: true, data: sops })
}

// POST - 创建 SOP
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, description, category, stages } = body

    if (!name) {
      return NextResponse.json({ success: false, error: { code: "NO_NAME", message: "请输入 SOP 名称" } }, { status: 400 })
    }

    const userId = getUserId(session)

    const sop = await prisma.sopTemplate.create({
      data: {
        orgId: session.user.orgId,
        creatorId: userId,
        name,
        description,
        category,
        stages: stages || JSON.stringify({ stages: [] }),
        status: "draft",
      },
    })

    // 记录审计日志
    await prisma.auditLog.create({
      data: {
        orgId: session.user.orgId,
        userId,
        action: "sop.create",
        resourceType: "SopTemplate",
        resourceId: sop.id,
        newValue: JSON.stringify({ name, description, category }),
      },
    })

    return NextResponse.json({ success: true, data: sop })
  } catch (error) {
    console.error("创建 SOP 失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "创建失败" } },
      { status: 500 }
    )
  }
}