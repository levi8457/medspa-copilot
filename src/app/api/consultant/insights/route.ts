import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }

    const orgId = session.user.orgId
    const consultantId = session.user.id

    const where = { orgId, consultantId }

    const [
      totalCustomers,
      tierStats,
      statusStats,
      taskStats,
      convertedCount,
      totalRevenue,
      recentTasks,
    ] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.groupBy({
        by: ["tier"],
        where,
        _count: true,
      }),
      prisma.customer.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),
      prisma.followUpTask.groupBy({
        by: ["status"],
        where: { orgId, consultantId },
        _count: true,
      }),
      prisma.customer.count({ where: { ...where, status: "converted" } }),
      prisma.consumptionRecord.aggregate({
        where: { customer: { consultantId } },
        _sum: { amount: true },
      }),
      prisma.followUpTask.findMany({
        where: { orgId, consultantId },
        include: {
          customer: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ])

    const tierCounts = Object.fromEntries(
      tierStats.filter((t) => t.tier).map((t) => [t.tier!, t._count])
    )
    const statusCounts = Object.fromEntries(statusStats.map((s) => [s.status, s._count]))
    const taskCounts = Object.fromEntries(taskStats.map((t) => [t.status, t._count]))

    const conversionRate = totalCustomers > 0 ? ((convertedCount / totalCustomers) * 100).toFixed(1) : "0"
    const avgOrderValue = convertedCount > 0 ? ((totalRevenue._sum.amount || 0) / convertedCount).toFixed(0) : "0"

    const tierDistribution = [
      { tier: "A", label: "A类 高价值", count: tierCounts.A || 0, color: "#00FFA3" },
      { tier: "B", label: "B类 优质", count: tierCounts.B || 0, color: "#00E5FF" },
      { tier: "C", label: "C类 普通", count: tierCounts.C || 0, color: "#FFB300" },
      { tier: "D", label: "D类 低优先", count: tierCounts.D || 0, color: "#6B7280" },
      { tier: null, label: "未分层", count: totalCustomers - (tierCounts.A || 0) - (tierCounts.B || 0) - (tierCounts.C || 0) - (tierCounts.D || 0), color: "#374151" },
    ]

    const last30Days = new Date()
    last30Days.setDate(last30Days.getDate() - 30)
    const newCustomersLast30 = await prisma.customer.count({
      where: { ...where, createdAt: { gte: last30Days } },
    })

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalCustomers,
          conversionRate,
          totalRevenue: totalRevenue._sum.amount || 0,
          avgOrderValue,
          newCustomersLast30,
          pendingTasks: taskCounts.pending || 0,
          completedTasks: taskCounts.done || 0,
        },
        tierDistribution,
        statusCounts,
        taskCounts,
        recentTasks: recentTasks.map((t) => ({
          id: t.id,
          title: t.goal || "跟进任务",
          customerName: t.customer.name,
          customerId: t.customer.id,
          status: t.status,
          scheduledDate: t.scheduledDate,
        })),
      },
    })
  } catch (error) {
    console.error("Get insights error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取数据洞察失败" } },
      { status: 500 }
    )
  }
}
