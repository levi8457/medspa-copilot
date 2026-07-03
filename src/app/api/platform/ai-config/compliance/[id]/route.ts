import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const updateComplianceWordSchema = z.object({
  category: z.enum(["prohibited_promise", "medical_term", "absolute_language", "false_publicity", "custom"]).optional(),
  word: z.string().min(1, "违规词不能为空").optional(),
  replacement: z.string().optional().nullable(),
  severity: z.enum(["low", "medium", "high"]).optional(),
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
    const result = updateComplianceWordSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } },
        { status: 400 }
      )
    }

    const existing = await prisma.complianceWord.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "合规词不存在" } },
        { status: 404 }
      )
    }

    const updatedWord = await prisma.complianceWord.update({
      where: { id },
      data: result.data,
    })

    return NextResponse.json({ success: true, data: updatedWord })
  } catch (error) {
    console.error("更新合规词失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "更新合规词失败" } },
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

    const existing = await prisma.complianceWord.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "合规词不存在" } },
        { status: 404 }
      )
    }

    await prisma.complianceWord.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error("删除合规词失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "删除合规词失败" } },
      { status: 500 }
    )
  }
}
