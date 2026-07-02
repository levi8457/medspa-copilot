import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getUserId } from "@/lib/db-tenant"

// POST - 保存标签体系 + 话术配置 + 通知配置
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  }

  if (session.user.role !== "org_admin" && session.user.role !== "super_admin") {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "无权修改系统设置" } }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { schemas, scriptConfig, notificationConfig } = body

    const userId = getUserId(session)

    // 1. 保存标签体系
    if (Array.isArray(schemas)) {
      await prisma.tagSchema.deleteMany({ where: { orgId: session.user.orgId } })
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
    }

    // 2. 保存话术配置和通知配置到 Organization
    const updateData: { scriptConfig?: string; notificationConfig?: string } = {}
    if (scriptConfig) {
      updateData.scriptConfig = JSON.stringify(scriptConfig)
    }
    if (notificationConfig) {
      updateData.notificationConfig = JSON.stringify(notificationConfig)
    }
    if (Object.keys(updateData).length > 0) {
      await prisma.organization.update({
        where: { id: session.user.orgId },
        data: updateData,
      })
    }

    // 审计日志
    await prisma.auditLog.create({
      data: {
        orgId: session.user.orgId,
        userId,
        action: "settings.update",
        resourceType: "Organization",
        newValue: JSON.stringify({
          tagCount: Array.isArray(schemas) ? schemas.length : 0,
          hasScriptConfig: !!scriptConfig,
          hasNotificationConfig: !!notificationConfig,
        }),
      },
    })

    return NextResponse.json({ success: true, data: { message: "设置已保存" } })
  } catch (error) {
    console.error("保存设置失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "保存失败" } },
      { status: 500 }
    )
  }
}

// GET - 获取标签体系 + 话术配置 + 通知配置
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  }

  const [schemas, org] = await Promise.all([
    prisma.tagSchema.findMany({
      where: { orgId: session.user.orgId },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.organization.findUnique({
      where: { id: session.user.orgId },
      select: { scriptConfig: true, notificationConfig: true },
    }),
  ])

  const formattedSchemas = schemas.map((schema) => ({
    id: schema.id,
    dimension: schema.dimension,
    values: JSON.parse(schema.values),
    isRequired: schema.isRequired,
    sortOrder: schema.sortOrder,
  }))

  const scriptConfig = org?.scriptConfig ? JSON.parse(org.scriptConfig) : null
  const notificationConfig = org?.notificationConfig ? JSON.parse(org.notificationConfig) : null

  return NextResponse.json({
    success: true,
    data: { schemas: formattedSchemas, scriptConfig, notificationConfig },
  })
}
