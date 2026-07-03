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
  ArrowUpDown,
} from "lucide-react"
import Link from "next/link"

function maskPhone(phone: string | null): string {
  if (!phone || phone.length < 7) return phone || ""
  return phone.slice(0, 3) + "****" + phone.slice(7)
}

const statusMap: Record<string, { label: string; color: string }> = {
  lead: { label: "线索", color: "var(--accent)" },
  contacted: { label: "已联系", color: "var(--primary)" },
  negotiating: { label: "洽谈中", color: "var(--warning)" },
  converted: { label: "已成交", color: "var(--success)" },
  churned: { label: "已流失", color: "var(--danger)" },
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; sortBy?: string; sortOrder?: string; tier?: string }>
}) {
  const session = await auth()
  if (!session) {
    redirect("/login")
  }

  const params = await searchParams
  const statusFilter = params.status
  const searchQuery = params.search
  const sortBy = params.sortBy || "createdAt"
  const sortOrder = params.sortOrder || "desc"
  const tierFilter = params.tier

  const where: Record<string, unknown> = {
    orgId: session.user.orgId,
  }

  if (session.user.role === "consultant") {
    where.consultantId = session.user.id
  }

  if (statusFilter) {
    where.status = statusFilter
  }

  if (tierFilter) {
    where.tier = tierFilter
  }

  if (searchQuery) {
    where.OR = [
      { name: { contains: searchQuery } },
      { phone: { contains: searchQuery } },
      { wechat: { contains: searchQuery } },
    ]
  }

  // 构建排序
  let orderBy: Record<string, string> = { createdAt: "desc" }
  if (sortBy === "name") {
    orderBy = { name: sortOrder }
  } else if (sortBy === "status") {
    orderBy = { status: sortOrder }
  } else if (sortBy === "updatedAt") {
    orderBy = { updatedAt: sortOrder }
  }

  const customers = await prisma.customer.findMany({
    where,
    include: {
      tags: {
        select: {
          dimension: true,
          value: true,
        },
        take: 5,
      },
      _count: {
        select: {
          audioRecords: true,
          followUpPlans: true,
        },
      },
    },
    orderBy,
    take: 50,
  })

  const stats = await prisma.customer.groupBy({
    by: ["status"],
    where: {
      orgId: session.user.orgId,
      ...(session.user.role === "consultant" && { consultantId: session.user.id }),
    },
    _count: true,
  })

  const statusCounts = Object.fromEntries(stats.map((s) => [s.status, s._count]))

  const tierStats = await prisma.customer.groupBy({
    by: ["tier"],
    where: {
      orgId: session.user.orgId,
      ...(session.user.role === "consultant" && { consultantId: session.user.id }),
    },
    _count: true,
  })

  const tierMap: Record<string, { label: string; color: string }> = {
    A: { label: "A类 高价值", color: "var(--success)" },
    B: { label: "B类 优质", color: "var(--primary)" },
    C: { label: "C类 普通", color: "var(--warning)" },
    D: { label: "D类 低优先", color: "var(--foreground-secondary)" },
  }

  const tierCounts = Object.fromEntries(
    tierStats
      .filter((t) => t.tier)
      .map((t) => [t.tier!, t._count])
  )

  return (
    <div className="p-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-wider text-[var(--primary)]">
            客户管理
          </h1>
          <p className="text-[var(--foreground-secondary)] text-sm">管理您的客户档案</p>
        </div>
        <Link
          href="/customers/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--background)] font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          新建客户
        </Link>
      </header>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <Link
          href="/customers"
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
            href={`/customers?status=${status}`}
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

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <Link
          href={`/customers?${new URLSearchParams({
            ...(statusFilter ? { status: statusFilter } : {}),
            ...(searchQuery ? { search: searchQuery } : {}),
          }).toString()}`}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            !tierFilter
              ? "bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30"
              : "bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--accent)]"
          }`}
        >
          全部分层
        </Link>
        {Object.entries(tierMap).map(([tier, { label, color }]) => (
          <Link
            key={tier}
            href={`/customers?${new URLSearchParams({
              ...(statusFilter ? { status: statusFilter } : {}),
              ...(searchQuery ? { search: searchQuery } : {}),
              tier,
            }).toString()}`}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              tierFilter === tier
                ? "border"
                : "bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--accent)]"
            }`}
            style={tierFilter === tier ? { backgroundColor: `${color}20`, color, borderColor: color } : {}}
          >
            {label} ({tierCounts[tier] || 0})
          </Link>
        ))}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--foreground-secondary)]" />
        <form action="/customers" method="GET">
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

      <div className="flex items-center gap-2 mb-4">
        <ArrowUpDown className="w-4 h-4 text-[var(--foreground-secondary)]" />
        <span className="text-sm text-[var(--foreground-secondary)]">排序：</span>
        {[
          { key: "createdAt", label: "创建时间" },
          { key: "name", label: "姓名" },
          { key: "updatedAt", label: "最近更新" },
        ].map((item) => (
          <Link
            key={item.key}
            href={`/customers?${new URLSearchParams({
              ...(statusFilter ? { status: statusFilter } : {}),
              ...(searchQuery ? { search: searchQuery } : {}),
              sortBy: item.key,
              sortOrder: sortBy === item.key && sortOrder === "asc" ? "desc" : "asc",
            }).toString()}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              sortBy === item.key
                ? "bg-[var(--primary)] text-[var(--background)]"
                : "bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)]"
            }`}
          >
            {item.label}
            {sortBy === item.key && (
              <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
            )}
          </Link>
        ))}
      </div>

      <div className="space-y-4">
        {customers.length === 0 ? (
          <GlowCard variant="primary" className="p-8 text-center">
            <User className="w-12 h-12 mx-auto mb-4 text-[var(--foreground-secondary)]" />
            <p className="text-[var(--foreground-secondary)]">暂无客户数据</p>
            <Link
              href="/customers/new"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-[var(--primary)]/20 text-[var(--primary)] hover:bg-[var(--primary)]/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              创建第一个客户
            </Link>
          </GlowCard>
        ) : (
          customers.map((customer) => {
            const statusInfo = statusMap[customer.status] || statusMap.lead
            const intentTag = customer.tags.find((t) => t.dimension === "需求意向")
            const intentValue =
              intentTag?.value === "高意向" ? 80 : intentTag?.value === "中等意向" ? 50 : 30
            const tierInfo = customer.tier ? tierMap[customer.tier] : null

            return (
              <Link key={customer.id} href={`/customers/${customer.id}`}>
                <GlowCard
                  variant="primary"
                  className="p-4 hover:scale-[1.01] transition-transform cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <EnergyRing
                        value={intentValue}
                        variant={intentValue > 60 ? "success" : intentValue > 30 ? "warning" : "accent"}
                        size={60}
                        label=""
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-lg">{customer.name}</span>
                          <span
                            className="px-2 py-0.5 rounded text-xs"
                            style={{ backgroundColor: `${statusInfo.color}20`, color: statusInfo.color }}
                          >
                            {statusInfo.label}
                          </span>
                          {tierInfo && (
                            <span
                              className="px-2 py-0.5 rounded text-xs font-medium"
                              style={{ backgroundColor: `${tierInfo.color}20`, color: tierInfo.color }}
                            >
                              {customer.tier}类
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-[var(--foreground-secondary)]">
                          {customer.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {maskPhone(customer.phone)}
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
  )
}
