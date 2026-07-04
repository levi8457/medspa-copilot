import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// 获取所有启用的套餐列表（公开接口，无需登录）
export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    })

    return NextResponse.json({ success: true, data: plans })
  } catch (error) {
    console.error("获取套餐列表失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取套餐列表失败" } },
      { status: 500 }
    )
  }
}
