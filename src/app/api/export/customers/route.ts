import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { withTenantFilter } from "@/lib/db-tenant"

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

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    lead: "待跟进",
    contacted: "已联系",
    negotiating: "洽谈中",
    converted: "已成交",
    churned: "已流失",
  }
  return map[status] || status
}

function getGenderLabel(gender: string | null | undefined): string {
  if (!gender) return ""
  const map: Record<string, string> = {
    male: "男",
    female: "女",
    other: "其他",
  }
  return map[gender] || gender
}

function getTierLabel(tier: string | null | undefined): string {
  if (!tier) return ""
  return `${tier}级客户`
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const tier = searchParams.get("tier")
    const source = searchParams.get("source")
    const consultantId = searchParams.get("consultantId")
    const keyword = searchParams.get("keyword")

    const where = withTenantFilter("Customer", session, {}).where as Record<string, unknown>

    if (status) {
      where.status = status
    }
    if (tier) {
      where.tier = tier
    }
    if (source) {
      where.source = source
    }
    if (consultantId && session.user.role !== "consultant") {
      where.consultantId = consultantId
    }
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { phone: { contains: keyword } },
        { wechat: { contains: keyword } },
      ]
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        followUpTasks: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    })

    const headers = [
      "姓名",
      "电话",
      "微信",
      "年龄",
      "性别",
      "来源",
      "状态",
      "分层",
      "分层得分",
      "健康度",
      "创建时间",
      "最后跟进时间",
    ]

    const rows = customers.map((customer) => [
      customer.name,
      customer.phone || "",
      customer.wechat || "",
      customer.age || "",
      getGenderLabel(customer.gender),
      customer.source || "",
      getStatusLabel(customer.status),
      getTierLabel(customer.tier),
      customer.tierScore != null ? customer.tierScore : "",
      customer.healthScore != null ? customer.healthScore : "",
      formatDate(customer.createdAt),
      customer.followUpTasks.length > 0 ? formatDate(customer.followUpTasks[0].createdAt) : "",
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
    const filename = `customers_${dateStr}.csv`

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    })
  } catch (error) {
    console.error("导出客户列表失败:", error)
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: "导出客户列表失败" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
