import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { validateResourceOwnership } from "@/lib/db-tenant"
import { z } from "zod"

const updateTagSchema = z.object({
  tagId: z.string().optional(),
  dimension: z.string().min(1),
  value: z.string().min(1),
  action: z.enum(["create", "update", "delete"]),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  }

  const { id: customerId } = await params

  const hasAccess = await validateResourceOwnership("Customer", customerId, session)
  if (!hasAccess) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "无权操作此客户" } }, { status: 403 })
  }

  const body = await request.json()
  const result = updateTagSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } },
      { status: 400 }
    )
  }

  const { tagId, dimension, value, action } = result.data

  try {
    if (action === "create") {
      const tag = await prisma.customerTag.create({
        data: {
          orgId: session.user.orgId,
          customerId,
          dimension,
          value,
          isManuallyModified: true,
          modifiedBy: session.user.id,
          modifiedAt: new Date(),
        },
      })

      await prisma.auditLog.create({
        data: {
          orgId: session.user.orgId,
          userId: session.user.id,
          action: "tag.create",
          resourceType: "CustomerTag",
          resourceId: tag.id,
          newValue: JSON.stringify({ customerId, dimension, value, source: "manual" }),
        },
      })

      return NextResponse.json({ success: true, data: tag })
    }

    if (action === "update" && tagId) {
      const existingTag = await prisma.customerTag.findUnique({ where: { id: tagId } })
      if (!existingTag || existingTag.customerId !== customerId) {
        return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "标签不存在" } }, { status: 404 })
      }

      const tag = await prisma.customerTag.update({
        where: { id: tagId },
        data: {
          value,
          isManuallyModified: true,
          modifiedBy: session.user.id,
          modifiedAt: new Date(),
        },
      })

      await prisma.auditLog.create({
        data: {
          orgId: session.user.orgId,
          userId: session.user.id,
          action: "tag.update",
          resourceType: "CustomerTag",
          resourceId: tagId,
          oldValue: JSON.stringify({ dimension, value: existingTag.value }),
          newValue: JSON.stringify({ dimension, value }),
        },
      })

      return NextResponse.json({ success: true, data: tag })
    }

    if (action === "delete" && tagId) {
      const existingTag = await prisma.customerTag.findUnique({ where: { id: tagId } })
      if (!existingTag || existingTag.customerId !== customerId) {
        return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "标签不存在" } }, { status: 404 })
      }

      await prisma.customerTag.delete({ where: { id: tagId } })

      await prisma.auditLog.create({
        data: {
          orgId: session.user.orgId,
          userId: session.user.id,
          action: "tag.delete",
          resourceType: "CustomerTag",
          resourceId: tagId,
          oldValue: JSON.stringify({
            dimension: existingTag.dimension,
            value: existingTag.value,
          }),
        },
      })

      return NextResponse.json({ success: true, data: { id: tagId } })
    }

    return NextResponse.json({ success: false, error: { code: "INVALID_ACTION", message: "无效操作" } }, { status: 400 })
  } catch (error) {
    console.error("标签操作失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "操作失败" } },
      { status: 500 }
    )
  }
}
