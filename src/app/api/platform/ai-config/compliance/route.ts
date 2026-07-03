import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const createComplianceWordSchema = z.object({
  category: z.enum(["prohibited_promise", "medical_term", "absolute_language", "false_publicity", "custom"]),
  word: z.string().min(1, "违规词不能为空"),
  replacement: z.string().optional(),
  severity: z.enum(["low", "medium", "high"]).default("medium"),
})

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
    const page = parseInt(searchParams.get("page") || "1", 10)
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10)
    const category = searchParams.get("category")

    const where: Record<string, unknown> = { scope: "global" }
    if (category) {
      where.category = category
    }

    const [total, words] = await Promise.all([
      prisma.complianceWord.count({ where }),
      prisma.complianceWord.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        items: words,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    })
  } catch (error) {
    console.error("获取合规词库失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取合规词库失败" } },
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
    const result = createComplianceWordSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0].message } },
        { status: 400 }
      )
    }

    const existing = await prisma.complianceWord.findFirst({
      where: {
        scope: "global",
        word: result.data.word,
        category: result.data.category,
      },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE_WORD", message: "该分类下已存在相同违规词" } },
        { status: 409 }
      )
    }

    const word = await prisma.complianceWord.create({
      data: {
        ...result.data,
        scope: "global",
      },
    })

    return NextResponse.json({ success: true, data: word }, { status: 201 })
  } catch (error) {
    console.error("添加合规词失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "添加合规词失败" } },
      { status: 500 }
    )
  }
}
