import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { validateResourceOwnership } from "@/lib/db-tenant"
import { z } from "zod"

// 互动渠道枚举（与 schema.prisma 中 CustomerInteraction.channel 注释一致）
const channelEnum = z.enum([
  "wechat",
  "phone",
  "in_store",
  "recording",
  "campaign",
])

// 互动方向枚举
const directionEnum = z.enum([
  "consultant_initiated",
  "customer_initiated",
])

// 手动添加互动记录的请求体 Schema
const createInteractionSchema = z.object({
  channel: channelEnum,
  direction: directionEnum,
  duration: z.number().int().min(0).optional(),
  content: z.string().optional(),
  summary: z.string().optional(),
  hasReply: z.boolean().default(false),
  replyTime: z.number().int().min(0).optional(),
  occurredAt: z.string().datetime().optional(), // ISO 8601 字符串
})

// GET - 获取客户互动记录列表（分页，按 occurredAt 降序，默认 20 条/页，支持 channel 筛选）
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

    // 验证客户归属权限（consultant 只能查看自己名下客户）
    const hasAccess = await validateResourceOwnership("Customer", id, session)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "无权访问此客户" } },
        { status: 403 }
      )
    }

    // 解析分页与筛选参数
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"))
    const pageSize = Math.max(
      1,
      Math.min(100, Number(searchParams.get("pageSize") ?? "20"))
    )
    const channel = searchParams.get("channel") // 可选渠道筛选

    // orgId 一律从 session 取，禁止信任前端传入
    const where: {
      customerId: string
      orgId: string
      channel?: string
    } = {
      customerId: id,
      orgId: session.user.orgId,
    }
    if (channel) {
      where.channel = channel
    }

    const [total, items] = await Promise.all([
      prisma.customerInteraction.count({ where }),
      prisma.customerInteraction.findMany({
        where,
        orderBy: { occurredAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error("获取互动记录列表失败:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "获取互动记录列表失败" },
      },
      { status: 500 }
    )
  }
}

// POST - 手动添加互动记录
export async function POST(
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

    // 校验客户存在且属于该 orgId（禁止信任前端传入的 orgId，一律从 session 取）
    const customer = await prisma.customer.findFirst({
      where: { id, orgId: session.user.orgId },
      select: { id: true, consultantId: true },
    })

    if (!customer) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "客户不存在" } },
        { status: 404 }
      )
    }

    // consultant 角色额外校验 consultantId 归属（只能操作自己名下客户）
    if (
      session.user.role === "consultant" &&
      customer.consultantId !== session.user.id
    ) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "无权操作此客户" } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const result = createInteractionSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: result.error.issues[0].message,
          },
        },
        { status: 400 }
      )
    }

    const { occurredAt, ...rest } = result.data

    // 咨询师归属：consultant 角色记录自己的 userId；admin 角色记录客户的 consultantId
    const consultantId =
      session.user.role === "consultant"
        ? session.user.id
        : customer.consultantId

    const interaction = await prisma.customerInteraction.create({
      data: {
        orgId: session.user.orgId,
        customerId: id,
        consultantId,
        occurredAt: occurredAt ? new Date(occurredAt) : undefined,
        ...rest,
      },
    })

    return NextResponse.json({
      success: true,
      data: interaction,
    })
  } catch (error) {
    console.error("添加互动记录失败:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "添加互动记录失败" },
      },
      { status: 500 }
    )
  }
}
