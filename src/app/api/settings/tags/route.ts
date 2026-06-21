import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getUserId } from "@/lib/db-tenant"

// POST - 保存标签体系配置
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  }

  // 只有管理员可以修改设置
  if (session.user.role !== "org_admin" && session.user.role !== "super_admin") {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "无权修改系统设置" } }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { schemas } = body

    if (!Array.isArray(schemas)) {
      return NextResponse.json({ success: false, error: { code: "INVALID_DATA", message: "数据格式错误" } }, { status: 400 })
    }

    const userId = getUserId(session)

    // 删除现有配置并重新创建
    await prisma.tagSchema.deleteMany({
      where: { orgId: session.user.orgId },
    })

    // 创建新的标签配置
    for (const schema of schemas) {
      await prisma.tagSchema.create({
        data: {
          orgId: session.user.orgId,
          dimension: schema.dimension,
          values: JSON.stringify(schema.values),
          isRequired: schema.isRequired || false,
          sortOrder: schema.sortOrder || 0,
        },
      })
    }

    // 记录审计日志
    await prisma.auditLog.create({
      data: {
        orgId: session.user.orgId,
        userId,
        action: "settings.tags.update",
        resourceType: "TagSchema",
        newValue: JSON.stringify({ count: schemas.length }),
      },
    })

    return NextResponse.json({
      success: true,
      data: { message: "标签体系配置已保存" },
    })
  } catch (error) {
    console.error("保存标签配置失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "保存失败" } },
      { status: 500 }
    )
  }
}

// GET - 获取标签体系配置
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  }

  const schemas = await prisma.tagSchema.findMany({
    where: { orgId: session.user.orgId },
    orderBy: { sortOrder: "asc" },
  })

  const formattedSchemas = schemas.map((schema) => ({
    id: schema.id,
    dimension: schema.dimension,
    values: JSON.parse(schema.values),
    isRequired: schema.isRequired,
    sortOrder: schema.sortOrder,
  }))

  return NextResponse.json({ success: true, data: formattedSchemas })
}