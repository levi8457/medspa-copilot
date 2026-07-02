import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role === "consultant") {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "无权操作" } }, { status: 403 })
    }

    const body = await request.json()
    const { leadIds, consultantId } = body

    if (!leadIds || !leadIds.length || !consultantId) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "参数错误" } }, { status: 400 })
    }

    await prisma.customer.updateMany({
      where: {
        id: { in: leadIds },
        orgId: session.user.orgId,
      },
      data: {
        consultantId,
      },
    })

    return NextResponse.json({ success: true, data: { count: leadIds.length } })
  } catch (error) {
    console.error("批量分配线索失败:", error)
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "批量分配线索失败" } }, { status: 500 })
  }
}