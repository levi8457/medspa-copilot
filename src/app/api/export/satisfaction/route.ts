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

function formatDate(date: Date | null | undefined): string {
  if (!date) return ""
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const hours = String(d.getHours()).padStart(2, "0")
  const minutes = String(d.getMinutes()).padStart(2, "0")
  const seconds = String(d.getSeconds()).padStart(2, "0")
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    post_visit: "到店后回访",
    service_review: "服务评价",
    nps: "NPS调研",
  }
  return map[type] || type
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "待填写",
    completed: "已完成",
    alerted: "需关注",
  }
  return map[status] || status
}

const VALID_TYPES = ["post_visit", "service_review", "nps"] as const
type SurveyType = (typeof VALID_TYPES)[number]

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
    const statusFilter = searchParams.get("status")
    const typeFilter = searchParams.get("type")
    const minRating = searchParams.get("minRating")
    const maxRating = searchParams.get("maxRating")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const where: Record<string, unknown> = { orgId }

    if (statusFilter) {
      where.status = statusFilter
    }
    if (typeFilter && VALID_TYPES.includes(typeFilter as SurveyType)) {
      where.type = typeFilter
    }

    const ratingFilter: Record<string, number> = {}
    if (minRating) {
      ratingFilter.gte = parseInt(minRating)
    }
    if (maxRating) {
      ratingFilter.lte = parseInt(maxRating)
    }
    if (Object.keys(ratingFilter).length > 0) {
      where.rating = ratingFilter
    }

    const dateFilter: Record<string, Date> = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      dateFilter.lte = end
    }
    if (Object.keys(dateFilter).length > 0) {
      where.triggeredAt = dateFilter
    }

    const surveys = await prisma.satisfactionSurvey.findMany({
      where,
      orderBy: { triggeredAt: "desc" },
    })

    const customerIds = [...new Set(surveys.map((s) => s.customerId))]
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true },
    })
    const customerMap = Object.fromEntries(customers.map((c) => [c.id, c.name]))

    const headers = [
      "客户名",
      "调研类型",
      "评分(1-5)",
      "NPS评分",
      "反馈内容",
      "状态",
      "触发时间",
      "完成时间",
    ]

    const rows = surveys.map((survey) => [
      customerMap[survey.customerId] || "未知客户",
      getTypeLabel(survey.type),
      survey.rating != null ? survey.rating : "",
      survey.npsScore != null ? survey.npsScore : "",
      survey.feedback || "",
      getStatusLabel(survey.status),
      formatDate(survey.triggeredAt),
      formatDate(survey.completedAt),
    ])

    const csvContent =
      "\uFEFF" +
      [headers, ...rows]
        .map((row) => row.map((cell) => escapeCsvValue(cell)).join(","))
        .join("\n")

    const now = new Date()
    const dateStr =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0")
    const filename = `satisfaction_${dateStr}.csv`

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    })
  } catch (error) {
    console.error("导出满意度调研数据失败:", error)
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: "导出满意度调研数据失败" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
