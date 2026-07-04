import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/db-tenant"

function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function getMonthRange(monthStr: string): { start: Date; end: Date } {
  const [year, month] = monthStr.split("-").map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59, 999)
  return { start, end }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || !isAdmin(session)) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "无权访问" } }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      )
    }

    const orgId = session.user.orgId
    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month")
    const consultantId = searchParams.get("consultantId")

    const now = new Date()
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const targetMonth = month || defaultMonth
    const { start: monthStart, end: monthEnd } = getMonthRange(targetMonth)

    const consultants = await prisma.user.findMany({
      where: {
        orgId,
        role: "consultant",
        isActive: true,
        ...(consultantId ? { id: consultantId } : {}),
      },
      select: { id: true, name: true },
    })

    const performanceData = await Promise.all(
      consultants.map(async (member) => {
        const [
          newCustomers,
          totalCustomers,
          convertedCustomers,
          totalTasks,
          completedTasks,
          audioRecords,
          surveys,
        ] = await Promise.all([
          prisma.customer.count({
            where: {
              orgId,
              consultantId: member.id,
              createdAt: { gte: monthStart, lte: monthEnd },
            },
          }),
          prisma.customer.count({
            where: { orgId, consultantId: member.id },
          }),
          prisma.customer.count({
            where: {
              orgId,
              consultantId: member.id,
              status: "converted",
            },
          }),
          prisma.followUpTask.count({
            where: {
              orgId,
              consultantId: member.id,
              createdAt: { gte: monthStart, lte: monthEnd },
            },
          }),
          prisma.followUpTask.count({
            where: {
              orgId,
              consultantId: member.id,
              status: "done",
              executedAt: { gte: monthStart, lte: monthEnd },
            },
          }),
          prisma.audioRecord.count({
            where: {
              orgId,
              consultantId: member.id,
              createdAt: { gte: monthStart, lte: monthEnd },
            },
          }),
          prisma.satisfactionSurvey.findMany({
            where: {
              orgId,
              consultantId: member.id,
              completedAt: { gte: monthStart, lte: monthEnd },
              rating: { not: null },
            },
            select: { rating: true },
          }),
        ])

        const conversionRate =
          newCustomers > 0
            ? Math.round((convertedCustomers / newCustomers) * 1000) / 10
            : 0
        const completionRate =
          totalTasks > 0
            ? Math.round((completedTasks / totalTasks) * 1000) / 10
            : 0
        const avgRating =
          surveys.length > 0
            ? Math.round(
                (surveys.reduce((sum, s) => sum + (s.rating || 0), 0) /
                  surveys.length) *
                  10
              ) / 10
            : 0

        const performanceScore = Math.round(
          conversionRate * 0.3 +
            completionRate * 0.3 +
            (avgRating / 5) * 100 * 0.2 +
            Math.min(newCustomers * 2, 20) * 0.2
        )

        return {
          name: member.name,
          newCustomers,
          convertedCustomers,
          conversionRate,
          completedTasks,
          completionRate,
          audioRecords,
          avgRating,
          performanceScore,
        }
      })
    )

    const headers = [
      "咨询师姓名",
      "新增客户数",
      "成交客户数",
      "转化率(%)",
      "跟进任务完成数",
      "完成率(%)",
      "录音上传数",
      "平均评分",
      "绩效得分",
    ]

    const rows = performanceData.map((item) => [
      item.name,
      item.newCustomers,
      item.convertedCustomers,
      item.conversionRate,
      item.completedTasks,
      item.completionRate,
      item.audioRecords,
      item.avgRating,
      item.performanceScore,
    ])

    const csvContent =
      "\uFEFF" +
      [headers, ...rows]
        .map((row) => row.map((cell) => escapeCsvValue(cell)).join(","))
        .join("\n")

    const exportDate = new Date()
    const dateStr =
      exportDate.getFullYear().toString() +
      String(exportDate.getMonth() + 1).padStart(2, "0") +
      String(exportDate.getDate()).padStart(2, "0")
    const filename = `performance_${targetMonth}_${dateStr}.csv`

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    })
  } catch (error) {
    console.error("导出绩效数据失败:", error)
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: "导出绩效数据失败" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
