import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { status } = body

    const recommendation = await prisma.projectRecommendation.findUnique({
      where: { id },
    })

    if (!recommendation) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "推荐不存在" } },
        { status: 404 }
      )
    }

    if (recommendation.orgId !== session.user.orgId) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "无权操作" } },
        { status: 403 }
      )
    }

    const updateData: any = { status }
    if (status === "adopted") {
      updateData.adoptedAt = new Date()
    } else if (status === "converted") {
      updateData.convertedAt = new Date()
    }

    const updated = await prisma.projectRecommendation.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    console.error("Update recommendation error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "更新失败" } },
      { status: 500 }
    )
  }
}
