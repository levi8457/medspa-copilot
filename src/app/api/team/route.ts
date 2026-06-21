import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import prisma from "@/lib/db"
import { requireApiAuth } from "@/lib/auth/rbac"
import { z } from "zod"

const addMemberSchema = z.object({
  name: z.string().min(2, "姓名至少2个字符"),
  phone: z.string().min(11, "请输入有效的手机号"),
  password: z.string().min(6, "密码至少6个字符"),
  role: z.enum(["consultant", "org_admin"]).default("consultant"),
})

export async function POST(request: NextRequest) {
  const session = await requireApiAuth("org_admin")
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const result = addMemberSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } },
        { status: 400 }
      )
    }

    const { name, phone, password, role } = result.data

    const existingUser = await prisma.user.findFirst({
      where: { phone },
    })
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: { code: "USER_EXISTS", message: "该手机号已被使用" } },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        orgId: session.user.orgId,
        email: `${phone}@${session.user.orgId.slice(0, 8)}.local`,
        name,
        phone,
        password: hashedPassword,
        role,
      },
    })

    return NextResponse.json({
      success: true,
      data: { id: user.id, name: user.name, email: user.email },
    })
  } catch (error) {
    console.error("添加成员失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "添加失败，请稍后重试" } },
      { status: 500 }
    )
  }
}
