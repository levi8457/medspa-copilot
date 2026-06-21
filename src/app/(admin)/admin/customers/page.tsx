import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/db"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { TagCapsule } from "@/components/futuristic/TagCapsule"
import { EnergyRing } from "@/components/futuristic/EnergyRing"
import {
  Search,
  Plus,
  Phone,
  MessageCircle,
  User,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"

const statusMap: Record<string, { label: string; color: string }> = {
  lead: { label: "线索", color: "var(--accent)" },
  contacted: { label: "已联系", color: "var(--primary)" },
  negotiating: { label: "洽谈中", color: "var(--warning)" },
  converted: { label: "已成交", color: "var(--success)" },
  churned: { label: "已流失", color: "var(--danger)" },
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const params = await searchParams
  const statusFilter = params.status
  const searchQuery = params.search

  const where: Record<string, unknown> = {
    orgId: session.user.orgId,
  }

  if (statusFilter) where.status = statusFilter
  if (searchQuery) {
    where.OR = [
      { name: { contains: searchQuery } },
      { phone: { contains: searchQuery } },
      { wechat: { contains: searchQuery } },
    ]
  }

  const customers = await prisma.customer.findMany({
    where,
    include: {
      tags: { select: { dimension: true, value: true }, take: 5 },
      consultant: { select: { name: true } },
      _count: { select: { audioRecords: true, followUpPlans: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  const stats = await prisma.customer.groupBy({
    by: ["status"],
    where: { orgId: session.user.orgId },
    _count: true,
  })

  const statusCounts = Object.fromEntries(stats.map((s) => [s.status, s._count]))

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">客户管理</h1>
            <p className="text-[var(--foreground-secondary)] mt-1">管理机构全部客户档案</p>
          </div>
          <Link
            href="/admin/customers/new"
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            新建客户
          </Link>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          <Link
            href="/admin/customers"
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              !statusFilter
                ? "bg-[var(--primary)] text-[var(--background)]"
                : "bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)]"
            }`}
          >
            全部 ({Object.values(statusCounts).reduce((a, b) => a + b, 0)})
          </Link>
          {Object.entries(statusMap).map(([status, { label }]) => (
            <Link
              key={status}
              href={`/admin/customers?status=${status}`}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? "bg-[var(--primary)] text-[var(--background)]"
                  : "bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)]"
              }`}
            >
              {label} ({statusCounts[status] || 0})
            </Link>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--foreground-secondary)]" />
          <form action="/admin/customers" method="GET">
            {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
            <input
              type="text"
              name="search"
              defaultValue={searchQuery}
              placeholder="搜索客户姓名、手机号、微信..."
              className="w-full pl-12 pr-4 py-3 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
            />
          </form>
        </div>

        <div className="space-y-4">
          {customers.length === 0 ? (
            <GlowCard className="p-8 text-center">
              <User className="w-12 h-12 mx-auto mb-4 text-[var(--foreground-secondary)]" />
              <p className="text-[var(--foreground-secondary)]">暂无客户数据</p>
            </GlowCard>
          ) : (
            customers.map((customer) => {
              const statusInfo = statusMap[customer.status] || statusMap.lead
              const intentTag = customer.tags.find((t) => t.dimension === "需求意向")
              const intentValue =
                intentTag?.value === "高意向" ? 80 : intentTag?.value === "中等意向" ? 50 : 30

              return (
                <Link key={customer.id} href={`/admin/customers/${customer.id}`}>
                  <GlowCard className="p-4 hover:scale-[1.01] transition-transform cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <EnergyRing
                          value={intentValue}
                          variant={intentValue > 60 ? "success" : intentValue > 30 ? "warning" : "accent"}
                          size={60}
                          label=""
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-lg">{customer.name}</span>
                            <span
                              className="px-2 py-0.5 rounded text-xs"
                              style={{ backgroundColor: `${statusInfo.color}20`, color: statusInfo.color }}
                            >
                              {statusInfo.label}
                            </span>
                            {customer.consultant && (
                              <span className="text-xs text-[var(--foreground-secondary)]">
                                @{customer.consultant.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-[var(--foreground-secondary)]">
                            {customer.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {customer.phone}
                              </span>
                            )}
                            {customer.wechat && (
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                {customer.wechat}
                              </span>
                            )}
                            <span>{customer._count.audioRecords} 条录音</span>
                          </div>
                          {customer.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {customer.tags.map((tag, idx) => (
                                <TagCapsule
                                  key={idx}
                                  label={tag.value}
                                  variant={tag.dimension === "需求意向" ? "success" : "primary"}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[var(--foreground-secondary)]" />
                    </div>
                  </GlowCard>
                </Link>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
