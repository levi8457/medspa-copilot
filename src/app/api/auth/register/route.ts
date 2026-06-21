import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import prisma from "@/lib/db"
import { z } from "zod"

const registerSchema = z.object({
  name: z.string().min(2, "姓名至少2个字符"),
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少6个字符"),
  orgName: z.string().min(2, "机构名称至少2个字符"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 验证输入
    const result = registerSchema.safeParse(body)
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

    const { name, email, password, orgName } = result.data

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMAIL_EXISTS",
            message: "该邮箱已被注册",
          },
        },
        { status: 400 }
      )
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)

    // 创建机构和用户（事务）
    const user = await prisma.$transaction(async (tx) => {
      // 创建机构
      const org = await tx.organization.create({
        data: {
          name: orgName,
          slug: orgName.toLowerCase().replace(/\s+/g, "-"),
        },
      })

      // 创建用户（作为机构管理员）
      const newUser = await tx.user.create({
        data: {
          orgId: org.id,
          email,
          name,
          password: hashedPassword,
          role: "org_admin",
        },
      })

      return newUser
    })

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    console.error("注册失败:", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "注册失败，请稍后重试",
        },
      },
      { status: 500 }
    )
  }
}
