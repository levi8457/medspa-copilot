import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session || session.user.role === "consultant") {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401 })
  }

  const orgId = session.user.orgId

  const [
    totalCustomers,
    statusCounts,
    totalRevenue,
    pendingTasks,
    completedTasks,
    totalTasks,
    teamPerformance,
  ] = await Promise.all([
    prisma.customer.count({ where: { orgId } }),
    prisma.customer.groupBy({ by: ["status"], where: { orgId }, _count: true }),
    prisma.consumptionRecord.aggregate({ where: { orgId }, _sum: { amount: true } }),
    prisma.followUpTask.count({ where: { orgId, status: "pending" } }),
    prisma.followUpTask.count({ where: { orgId, status: "done" } }),
    prisma.followUpTask.count({ where: { orgId } }),
    prisma.user.findMany({
      where: { orgId, role: "consultant" },
      select: {
        id: true,
        name: true,
        _count: { select: { customers: true } },
      },
    }),
  ])

  const statusMap = Object.fromEntries(statusCounts.map((s) => [s.status, s._count]))
  const converted = (statusMap["converted"] || 0) as number
  const conversionRate = totalCustomers > 0 ? Math.round((converted / totalCustomers) * 1000) / 10 : 0
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 1000) / 10 : 0

  const team = await Promise.all(
    teamPerformance.map(async (member) => {
      const memberTasks = await prisma.followUpTask.count({
        where: { orgId, consultantId: member.id },
      })
      const memberCompleted = await prisma.followUpTask.count({
        where: { orgId, consultantId: member.id, status: "done" },
      })
      const memberConverted = await prisma.customer.count({
        where: { orgId, consultantId: member.id, status: "converted" },
      })
      const memberTotal = member._count.customers

      return {
        name: member.name,
        customers: memberTotal,
        conversionRate: memberTotal > 0 ? Math.round((memberConverted / memberTotal) * 1000) / 10 : 0,
        completionRate: memberTasks > 0 ? Math.round((memberCompleted / memberTasks) * 1000) / 10 : 0,
      }
    })
  )

  return NextResponse.json({
    success: true,
    data: {
      totalCustomers,
      newCustomers: statusMap["lead"] || 0,
      conversionRate,
      repurchaseRate: 0,
      totalRevenue: totalRevenue._sum.amount || 0,
      pendingTasks,
      completedTasks,
      teamPerformance: team,
      funnel: [
        { name: "线索", value: (statusMap["lead"] || 0) as number },
        { name: "已联系", value: (statusMap["contacted"] || 0) as number },
        { name: "洽谈中", value: (statusMap["negotiating"] || 0) as number },
        { name: "已成交", value: (statusMap["converted"] || 0) as number },
      ],
    },
  })
}
