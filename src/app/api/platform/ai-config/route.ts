import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const updateConfigSchema = z.object({
  items: z.array(
    z.object({
      key: z.string().min(1, "配置键不能为空"),
      value: z.string(),
    })
  ).min(1, "配置项不能为空"),
})

export async function GET() {
  try {
    const session = await auth()
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "无权限访问" } },
        { status: 403 }
      )
    }

    const configs = await prisma.aIConfig.findMany({
      where: { scope: "global" },
      orderBy: { key: "asc" },
    })

    return NextResponse.json({ success: true, data: configs })
  } catch (error) {
    console.error("获取 AI 配置失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取 AI 配置失败" } },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "无权限访问" } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const result = updateConfigSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } },
        { status: 400 }
      )
    }

    const { items } = result.data

    const updatedConfigs = await Promise.all(
      items.map(async (item) => {
        const existing = await prisma.aIConfig.findFirst({
          where: { scope: "global", key: item.key },
        })

        if (existing) {
          return prisma.aIConfig.update({
            where: { id: existing.id },
            data: {
              value: item.value,
              updatedBy: session.user.id,
            },
          })
        } else {
          return prisma.aIConfig.create({
            data: {
              scope: "global",
              key: item.key,
              value: item.value,
              updatedBy: session.user.id,
            },
          })
        }
      })
    )

    return NextResponse.json({ success: true, data: updatedConfigs })
  } catch (error) {
    console.error("更新 AI 配置失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "更新 AI 配置失败" } },
      { status: 500 }
    )
  }
}
