import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"

const createOrgSchema = z.object({
  name: z.string().min(2, "机构名称至少2个字符"),
  adminName: z.string().min(2, "管理员姓名至少2个字符"),
  adminPhone: z.string().regex(/^1[3-9]\d{9}$/, "请输入有效的手机号"),
  adminPassword: z.string().min(6, "密码至少6个字符"),
  planId: z.string().min(1, "请选择套餐"),
})

// 获取机构列表（含订阅与套餐）
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "无权限访问" } },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")
    const search = searchParams.get("search")
    const status = searchParams.get("status")

    const where: Record<string, unknown> = {}
    if (search) {
      where.name = { contains: search }
    }
    if (status) {
      where.subscriptions = { some: { status } }
    }

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        include: {
          subscriptions: {
            include: { plan: true },
            orderBy: { createdAt: "desc" },
          },
          _count: { select: { users: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.organization.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        organizations,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    })
  } catch (error) {
    console.error("获取机构列表失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取机构列表失败" } },
      { status: 500 }
    )
  }
}

// 创建机构 + 管理员 + 试用订阅
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "无权限访问" } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const result = createOrgSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } },
        { status: 400 }
      )
    }

    const { name, adminName, adminPhone, adminPassword, planId } = result.data

    const plan = await prisma.plan.findUnique({ where: { id: planId } })
    if (!plan) {
      return NextResponse.json(
        { success: false, error: { code: "PLAN_NOT_FOUND", message: "套餐不存在" } },
        { status: 404 }
      )
    }

    const email = `${adminPhone}@org.local`
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: { code: "USER_EXISTS", message: "该手机号已被使用" } },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10)
    const now = new Date()
    const trialEndsAt = new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)

    const org = await prisma.$transaction(async (tx) => {
      const newOrg = await tx.organization.create({
        data: {
          name,
          slug: name.toLowerCase().replace(/\s+/g, "-"),
        },
      })

      await tx.user.create({
        data: {
          orgId: newOrg.id,
          email,
          name: adminName,
          phone: adminPhone,
          password: hashedPassword,
          role: "org_admin",
        },
      })

      await tx.subscription.create({
        data: {
          orgId: newOrg.id,
          planId,
          status: "trial",
          seatsLimit: plan.maxSeats,
          startsAt: now,
          trialEndsAt,
        },
      })

      await tx.auditLog.create({
        data: {
          orgId: newOrg.id,
          userId: session.user.id,
          action: "organization.create",
          resourceType: "Organization",
          resourceId: newOrg.id,
          newValue: JSON.stringify({ name, planId, adminPhone }),
        },
      })

      return newOrg
    })

    return NextResponse.json({ success: true, data: org }, { status: 201 })
  } catch (error) {
    console.error("创建机构失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "创建机构失败" } },
      { status: 500 }
    )
  }
}
