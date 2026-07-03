import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const updateStatusSchema = z.object({
  status: z.enum(["draft", "active", "archived"]),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "无权限访问" } },
        { status: 403 }
      )
    }

    const { id } = await params

    const body = await request.json()
    const result = updateStatusSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } },
        { status: 400 }
      )
    }

    const prompt = await prisma.promptVersion.findUnique({
      where: { id },
    })

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "提示词版本不存在" } },
        { status: 404 }
      )
    }

    if (result.data.status === "active") {
      await prisma.promptVersion.updateMany({
        where: {
          promptType: prompt.promptType,
          status: "active",
          id: { not: id },
        },
        data: { status: "archived" },
      })
    }

    const updatedPrompt = await prisma.promptVersion.update({
      where: { id },
      data: { status: result.data.status },
    })

    return NextResponse.json({ success: true, data: updatedPrompt })
  } catch (error) {
    console.error("更新提示词状态失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "更新提示词状态失败" } },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "无权限访问" } },
        { status: 403 }
      )
    }

    const { id } = await params

    const prompt = await prisma.promptVersion.findUnique({
      where: { id },
    })

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "提示词版本不存在" } },
        { status: 404 }
      )
    }

    if (prompt.status !== "draft") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_STATUS", message: "仅草稿状态的提示词可删除" } },
        { status: 400 }
      )
    }

    await prisma.promptVersion.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error("删除提示词版本失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "删除提示词版本失败" } },
      { status: 500 }
    )
  }
}
