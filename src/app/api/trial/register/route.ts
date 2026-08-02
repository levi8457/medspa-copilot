import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { notifyTrialApplication } from "@/lib/notify-trial"

const trialRegisterSchema = z.object({
  orgName: z.string().min(2, "机构名称至少2个字符"),
  contactName: z.string().min(2, "联系人姓名至少2个字符"),
  phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入有效的手机号"),
  code: z.string().min(1, "请输入验证码"),
  password: z.string().min(6, "密码至少6个字符"),
})

// 自助试用注册（公开接口，无需登录）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = trialRegisterSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } },
        { status: 400 }
      )
    }

    const { orgName, contactName, phone, password } = result.data

    // 检查手机号是否已注册
    const email = `${phone}@org.local`
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: { code: "USER_EXISTS", message: "该手机号已注册" } },
        { status: 400 }
      )
    }

    // 查找默认试用套餐
    const plan = await prisma.plan.findFirst({
      where: {
        isActive: true,
        OR: [{ priceMonthly: 0 }, { trialDays: { gt: 0 } }],
      },
      orderBy: { sortOrder: "asc" },
    })
    if (!plan) {
      return NextResponse.json(
        { success: false, error: { code: "NO_TRIAL_PLAN", message: "暂无可用试用套餐，请联系客服" } },
        { status: 500 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const now = new Date()
    const trialEndsAt = new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)

    await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: orgName,
          slug: orgName.toLowerCase().replace(/\s+/g, "-"),
        },
      })

      await tx.user.create({
        data: {
          orgId: org.id,
          email,
          name: contactName,
          phone,
          password: hashedPassword,
          role: "org_admin",
        },
      })

      await tx.subscription.create({
        data: {
          orgId: org.id,
          planId: plan.id,
          status: "trial",
          seatsLimit: plan.maxSeats,
          startsAt: now,
          trialEndsAt,
        },
      })
    })

    // 发送试用申请通知邮件（失败不影响注册结果）
    try {
      await notifyTrialApplication({
        orgName,
        contactName,
        phone,
        createdAt: now,
        trialEndsAt,
      })
    } catch (error) {
      console.error("试用申请邮件通知失败:", error)
    }

    // 不自动登录，引导用户前往登录页
    return NextResponse.json({
      success: true,
      data: { message: "注册成功，请前往登录" },
    })
  } catch (error) {
    console.error("试用注册失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "注册失败，请稍后重试" } },
      { status: 500 }
    )
  }
}
