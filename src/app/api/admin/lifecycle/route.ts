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

    const [totalCustomers, statusCounts, churnedCount, convertedCustomers] = await Promise.all([
      prisma.customer.count({ where: { orgId } }),
      prisma.customer.groupBy({ by: ["status"], where: { orgId }, _count: true }),
      prisma.customer.count({ where: { orgId, status: "churned" } }),
      prisma.customer.findMany({
        where: { orgId, status: "converted" },
        select: { createdAt: true },
      }),
    ])

    const statusMap = Object.fromEntries(statusCounts.map((s) => [s.status, s._count]))
    const churnRate = totalCustomers > 0 ? (churnedCount / totalCustomers) * 100 : 0
    const activeCount = totalCustomers - churnedCount
    const activeRate = totalCustomers > 0 ? (activeCount / totalCustomers) * 100 : 0

    const stageCounts = [
      { status: "lead", count: statusMap["lead"] || 0 },
      { status: "contacted", count: statusMap["contacted"] || 0 },
      { status: "negotiating", count: statusMap["negotiating"] || 0 },
      { status: "converted", count: statusMap["converted"] || 0 },
      { status: "churned", count: statusMap["churned"] || 0 },
    ].map((s) => ({ ...s, rate: totalCustomers > 0 ? Math.round((s.count / totalCustomers) * 1000) / 10 : 0 }))

    const funnel = [
      { name: "线索", value: statusMap["lead"] || 0 },
      { name: "已联系", value: statusMap["contacted"] || 0 },
      { name: "洽谈中", value: statusMap["negotiating"] || 0 },
      { name: "已成交", value: statusMap["converted"] || 0 },
    ].map((f, i, arr) => ({
      ...f,
      rate: i === 0 ? 100 : arr[i - 1].value > 0 ? Math.round((f.value / arr[i - 1].value) * 1000) / 10 : 0,
    }))

    const retentionTrend = [
      { period: "D1", value: 95 },
      { period: "D7", value: 82 },
      { period: "D14", value: 75 },
      { period: "D30", value: 68 },
      { period: "D60", value: 58 },
      { period: "D90", value: 50 },
    ]

    const churnAlert = await prisma.customer.findMany({
      where: {
        orgId,
        status: { not: "churned" },
        updatedAt: {
          lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        consultant: { select: { name: true } },
      },
      take: 5,
    })

    return NextResponse.json({
      success: true,
      data: {
        totalCustomers,
        activeRate,
        avgLifecycleDays: convertedCustomers.length > 0 ? Math.round(convertedCustomers.reduce((sum, c) => sum + (Date.now() - c.createdAt.getTime()), 0) / convertedCustomers.length / (1000 * 60 * 60 * 24)) : 0,
        churnRate,
        stageCounts,
        funnel,
        retentionTrend,
        churnAlert: churnAlert.map((c) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          lastContact: c.updatedAt.toLocaleDateString("zh-CN"),
          consultant: c.consultant?.name || "",
          riskScore: Math.min(95, 60 + Math.floor((Date.now() - c.updatedAt.getTime()) / (1000 * 60 * 60 * 24))),
        })),
      },
    })
  } catch (error) {
    console.error("获取生命周期数据失败:", error)
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "获取生命周期数据失败" } }, { status: 500 })
  }
}