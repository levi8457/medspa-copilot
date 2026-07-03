import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const createPromptSchema = z.object({
  promptType: z.enum(["tag_extraction", "strategy", "script", "compliance", "health", "profile"]),
  version: z.string().min(1, "版本号不能为空"),
  content: z.string().min(1, "提示词内容不能为空"),
  changeLog: z.string().optional(),
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

    const allPrompts = await prisma.promptVersion.findMany({
      orderBy: [{ promptType: "asc" }, { createdAt: "desc" }],
    })

    const promptTypes = ["tag_extraction", "strategy", "script", "compliance", "health", "profile"] as const

    const grouped = promptTypes.map((type) => {
      const typePrompts = allPrompts.filter((p) => p.promptType === type)
      const active = typePrompts.find((p) => p.status === "active") || null
      return {
        promptType: type,
        active,
        versions: typePrompts,
      }
    })

    return NextResponse.json({ success: true, data: grouped })
  } catch (error) {
    console.error("获取提示词版本失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取提示词版本失败" } },
      { status: 500 }
    )
  }
}

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
    const result = createPromptSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } },
        { status: 400 }
      )
    }

    const existingVersion = await prisma.promptVersion.findFirst({
      where: {
        promptType: result.data.promptType,
        version: result.data.version,
      },
    })

    if (existingVersion) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE_VERSION", message: "该类型下版本号已存在" } },
        { status: 409 }
      )
    }

    const prompt = await prisma.promptVersion.create({
      data: {
        ...result.data,
        status: "draft",
        createdBy: session.user.id,
      },
    })

    return NextResponse.json({ success: true, data: prompt }, { status: 201 })
  } catch (error) {
    console.error("创建提示词版本失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "创建提示词版本失败" } },
      { status: 500 }
    )
  }
}
