import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"
import { withTenantFilter } from "@/lib/db-tenant"

// 客户创建验证
const createCustomerSchema = z.object({
  name: z.string().min(1, "姓名不能为空"),
  phone: z.string().optional(),
  wechat: z.string().optional(),
  age: z.number().int().min(0).max(150).optional(),
  gender: z.string().optional(),
  source: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
})

// 获取客户列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    const where = withTenantFilter("Customer", session, {})

    // 添加状态过滤
    if (status) {
      where.status = status
    }

    // 添加搜索
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { wechat: { contains: search } },
      ]
    }

    // 构建排序
    let orderBy: Record<string, string> = { createdAt: "desc" }
    if (sortBy === "name") {
      orderBy = { name: sortOrder }
    } else if (sortBy === "status") {
      orderBy = { status: sortOrder }
    } else if (sortBy === "updatedAt") {
      orderBy = { updatedAt: sortOrder }
    } else if (sortBy === "intent") {
      // Intent sorting requires special handling via tags
      orderBy = { createdAt: sortOrder }
    }

    // 查询客户列表
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          tags: {
            select: {
              dimension: true,
              value: true,
            },
          },
          _count: {
            select: {
              audioRecords: true,
              followUpPlans: true,
            },
          },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.customer.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        customers,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    })
  } catch (error) {
    console.error("获取客户列表失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取客户列表失败" } },
      { status: 500 }
    )
  }
}

// 创建客户
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const result = createCustomerSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } },
        { status: 400 }
      )
    }

    const data = result.data

    // 创建客户
    const customer = await prisma.customer.create({
      data: {
        orgId: session.user.orgId,
        consultantId: session.user.id,
        name: data.name,
        phone: data.phone,
        wechat: data.wechat,
        age: data.age,
        gender: data.gender,
        source: data.source,
        notes: data.notes,
        status: data.status || "lead",
      },
    })

    // 创建时间线事件
    await prisma.timelineEvent.create({
      data: {
        orgId: session.user.orgId,
        customerId: customer.id,
        type: "note",
        title: "创建客户档案",
        content: `客户 ${data.name} 的档案已创建`,
      },
    })

    return NextResponse.json({
      success: true,
      data: customer,
    })
  } catch (error) {
    console.error("创建客户失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "创建客户失败" } },
      { status: 500 }
    )
  }
}
