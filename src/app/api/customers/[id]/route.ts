import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"
import { validateResourceOwnership } from "@/lib/db-tenant"

// 客户更新验证
const updateCustomerSchema = z.object({
  name: z.string().min(1, "姓名不能为空").optional(),
  phone: z.string().optional(),
  wechat: z.string().optional(),
  age: z.number().int().min(0).max(150).optional(),
  gender: z.string().optional(),
  source: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.object({ dimension: z.string(), value: z.string() })).optional(),
})

// 获取客户详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const { id } = await params

    // 验证权限
    const hasAccess = await validateResourceOwnership("Customer", id, session)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "无权访问此客户" } },
        { status: 403 }
      )
    }

    // 获取客户详情
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        tags: true,
        audioRecords: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        followUpPlans: {
          include: {
            tasks: {
              orderBy: { scheduledDate: "asc" },
              take: 10,
            },
          },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
        timelineEvents: {
          orderBy: { occurredAt: "desc" },
          take: 20,
        },
        consumptionRecords: {
          orderBy: { consumedAt: "desc" },
          take: 10,
        },
        consultant: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    })

    if (!customer) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "客户不存在" } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: customer,
    })
  } catch (error) {
    console.error("获取客户详情失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取客户详情失败" } },
      { status: 500 }
    )
  }
}

// 更新客户
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const { id } = await params

    // 验证权限
    const hasAccess = await validateResourceOwnership("Customer", id, session)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "无权修改此客户" } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const result = updateCustomerSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } },
        { status: 400 }
      )
    }

    const { tags, ...customerData } = result.data

    // 更新客户基本信息
    const customer = await prisma.customer.update({
      where: { id },
      data: customerData,
    })

    // 更新标签（如有提供）
    if (tags) {
      for (const tag of tags) {
        await prisma.customerTag.upsert({
          where: {
            customerId_dimension: { customerId: id, dimension: tag.dimension },
          },
          update: { value: tag.value },
          create: {
            orgId: session.user.orgId,
            customerId: id,
            dimension: tag.dimension,
            value: tag.value,
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: customer,
    })
  } catch (error) {
    console.error("更新客户失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "更新客户失败" } },
      { status: 500 }
    )
  }
}

// 删除客户
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const { id } = await params

    // 验证权限
    const hasAccess = await validateResourceOwnership("Customer", id, session)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "无权删除此客户" } },
        { status: 403 }
      )
    }

    // 删除客户
    await prisma.customer.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      data: { id },
    })
  } catch (error) {
    console.error("删除客户失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "删除客户失败" } },
      { status: 500 }
    )
  }
}
