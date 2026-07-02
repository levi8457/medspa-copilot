import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"

const createSourceSchema = z.object({
  name: z.string().min(1, "名称不能为空"),
  code: z.string().min(1, "编码不能为空"),
  description: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role === "consultant") {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "无权操作" } }, { status: 403 })
    }

    const sources = await prisma.leadSource.findMany({
      where: { orgId: session.user.orgId },
      orderBy: { sortOrder: "asc" },
    })

    return NextResponse.json({ success: true, data: sources })
  } catch (error) {
    console.error("获取线索来源失败:", error)
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "获取线索来源失败" } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role === "consultant") {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "无权操作" } }, { status: 403 })
    }

    const body = await request.json()
    const result = createSourceSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } }, { status: 400 })
    }

    const source = await prisma.leadSource.create({
      data: {
        orgId: session.user.orgId,
        ...result.data,
      },
    })

    return NextResponse.json({ success: true, data: source })
  } catch (error) {
    console.error("创建线索来源失败:", error)
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "创建线索来源失败" } }, { status: 500 })
  }
}