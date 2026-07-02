import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role === "consultant") {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "无权操作" } }, { status: 403 })
    }

    const orgId = session.user.orgId
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "month"

    const consultants = await prisma.user.findMany({
      where: { orgId, role: "consultant", isActive: true },
      select: { id: true, name: true },
    })

    const teamRanking = await Promise.all(
      consultants.map(async (member) => {
        const customerIds = (await prisma.customer.findMany({ where: { orgId, consultantId: member.id }, select: { id: true } })).map((c) => c.id)
        const [customerCount, convertedCount, revenue, totalTasks, completedTasks] = await Promise.all([
          prisma.customer.count({ where: { orgId, consultantId: member.id } }),
          prisma.customer.count({ where: { orgId, consultantId: member.id, status: "converted" } }),
          prisma.consumptionRecord.aggregate({
            where: { orgId, customerId: { in: customerIds } },
            _sum: { amount: true },
          }),
          prisma.followUpTask.count({ where: { orgId, consultantId: member.id } }),
          prisma.followUpTask.count({ where: { orgId, consultantId: member.id, status: "done" } }),
        ])

        return {
          id: member.id,
          name: member.name,
          avatar: "",
          customers: customerCount,
          converted: convertedCount,
          revenue: revenue._sum.amount || 0,
          conversionRate: customerCount > 0 ? Math.round((convertedCount / customerCount) * 1000) / 10 : 0,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 1000) / 10 : 0,
          responseRate: 0,
          trend: "stable" as const,
          trendValue: 0,
        }
      })
    )

    teamRanking.sort((a, b) => b.revenue - a.revenue)

    const totalRevenue = teamRanking.reduce((sum, m) => sum + m.revenue, 0)
    const totalDeals = teamRanking.reduce((sum, m) => sum + m.converted, 0)
    const avgConversionRate = teamRanking.length > 0 ? teamRanking.reduce((sum, m) => sum + m.conversionRate, 0) / teamRanking.length : 0
    const avgCompletionRate = teamRanking.length > 0 ? teamRanking.reduce((sum, m) => sum + m.completionRate, 0) / teamRanking.length : 0

    const periodStats = [
      { period: "W1", revenue: 28000, deals: 5, conversionRate: 68 },
      { period: "W2", revenue: 35000, deals: 7, conversionRate: 72 },
      { period: "W3", revenue: 42000, deals: 8, conversionRate: 75 },
      { period: "W4", revenue: 38000, deals: 6, conversionRate: 65 },
    ]

    const kpiTargets = [
      { name: "团队业绩", target: 500000, current: totalRevenue, unit: "元", progress: Math.min((totalRevenue / 500000) * 100, 100) },
      { name: "平均转化率", target: 70, current: avgConversionRate, unit: "%", progress: Math.min((avgConversionRate / 70) * 100, 100) },
      { name: "跟进完成率", target: 85, current: avgCompletionRate, unit: "%", progress: Math.min((avgCompletionRate / 85) * 100, 100) },
      { name: "客户满意度", target: 90, current: 88, unit: "%", progress: 98 },
    ]

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        avgConversionRate,
        avgCompletionRate,
        totalDeals,
        teamRanking: teamRanking.map((m, idx) => ({ ...m, rank: idx + 1 })),
        periodStats,
        kpiTargets,
      },
    })
  } catch (error) {
    console.error("获取绩效数据失败:", error)
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "获取绩效数据失败" } }, { status: 500 })
  }
}