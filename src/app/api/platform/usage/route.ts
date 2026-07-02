import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/db"

const USAGE_TYPES = ["asr_hours", "ai_calls", "storage_gb", "active_users"] as const
const DAY_MS = 24 * 60 * 60 * 1000

// 获取使用统计（最近 30 天，按天聚合）
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
    const orgId = searchParams.get("orgId")

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS)

    const where: Record<string, unknown> = {
      date: { gte: thirtyDaysAgo },
    }
    if (orgId) where.orgId = orgId

    const records = await prisma.usageRecord.findMany({
      where,
      orderBy: { date: "asc" },
    })

    // 按日期 + 类型聚合
    const byDayType = new Map<string, number>()
    for (const r of records) {
      const dayKey = r.date.toISOString().slice(0, 10)
      const key = `${dayKey}|${r.type}`
      byDayType.set(key, (byDayType.get(key) || 0) + r.value)
    }

    // 构建最近 30 天的日期序列
    const days: string[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * DAY_MS)
      days.push(d.toISOString().slice(0, 10))
    }

    const series = USAGE_TYPES.map((type) => ({
      type,
      data: days.map((day) => ({
        date: day,
        value: byDayType.get(`${day}|${type}`) || 0,
      })),
    }))

    return NextResponse.json({
      success: true,
      data: { series, days },
    })
  } catch (error) {
    console.error("获取使用统计失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取使用统计失败" } },
      { status: 500 }
    )
  }
}
