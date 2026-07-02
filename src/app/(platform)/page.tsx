import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/db"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { HudPanel } from "@/components/futuristic/HudPanel"
import { Building2, Activity, CalendarDays, FlaskConical, Receipt } from "lucide-react"

const subscriptionStatusMap: Record<string, { label: string; color: string }> = {
  trial: { label: "试用中", color: "var(--accent)" },
  active: { label: "有效", color: "var(--success)" },
  suspended: { label: "已暂停", color: "var(--warning)" },
  expired: { label: "已过期", color: "var(--danger)" },
  cancelled: { label: "已取消", color: "var(--foreground-secondary)" },
}

export default async function PlatformDashboardPage() {
  const session = await auth()
  if (!session || session.user.role !== "super_admin") {
    redirect("/login")
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalOrgs,
    activeOrgs,
    newThisMonth,
    trialingOrgs,
    recentOrgs,
    paidOrdersAggregate,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { isActive: true } }),
    prisma.organization.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.organization.count({
      where: { subscriptions: { some: { status: "trial" } } },
    }),
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.order.aggregate({
      where: { status: "paid" },
      _sum: { amount: true },
      _count: true,
    }),
  ])

  const totalPaidAmount = paidOrdersAggregate._sum.amount ?? 0
  const paidOrderCount = paidOrdersAggregate._count

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">平台总览</h1>
          <p className="text-[var(--foreground-secondary)] mt-1">全平台机构与收入数据概览</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <HudPanel
            label="机构总数"
            value={totalOrgs}
            icon={<Building2 />}
          />
          <HudPanel
            label="活跃机构"
            value={activeOrgs}
            icon={<Activity />}
            trend="up"
            trendValue={`占比 ${totalOrgs > 0 ? Math.round((activeOrgs / totalOrgs) * 100) : 0}%`}
          />
          <HudPanel
            label="本月新增"
            value={newThisMonth}
            icon={<CalendarDays />}
          />
          <HudPanel
            label="试用中机构"
            value={trialingOrgs}
            icon={<FlaskConical />}
          />
        </div>

        <GlowCard variant="primary" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-[var(--foreground)]">机构列表概览</h2>
            <span className="text-xs text-[var(--foreground-secondary)]">最近 5 家</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">机构名称</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">状态</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">订阅状态</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">创建时间</th>
                </tr>
              </thead>
              <tbody>
                {recentOrgs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[var(--foreground-secondary)]">
                      暂无机构数据
                    </td>
                  </tr>
                ) : (
                  recentOrgs.map((org) => {
                    const latestSub = org.subscriptions[0]
                    const subInfo = latestSub
                      ? subscriptionStatusMap[latestSub.status] || subscriptionStatusMap.trial
                      : null
                    return (
                      <tr key={org.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="py-3 px-4">
                          <span className="font-medium text-[var(--foreground)]">{org.name}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="px-2 py-0.5 rounded text-xs"
                            style={{
                              backgroundColor: org.isActive
                                ? "color-mix(in srgb, var(--success) 20%, transparent)"
                                : "color-mix(in srgb, var(--danger) 20%, transparent)",
                              color: org.isActive ? "var(--success)" : "var(--danger)",
                            }}
                          >
                            {org.isActive ? "活跃" : "已停用"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {subInfo ? (
                            <span
                              className="px-2 py-0.5 rounded text-xs"
                              style={{
                                backgroundColor: `color-mix(in srgb, ${subInfo.color} 20%, transparent)`,
                                color: subInfo.color,
                              }}
                            >
                              {subInfo.label}
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--foreground-secondary)]">未订阅</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--foreground-secondary)]">
                          {org.createdAt.toLocaleDateString("zh-CN")}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </GlowCard>

        <GlowCard variant="accent" className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-[var(--foreground-secondary)]">收入概览（已支付订单）</p>
                <p className="text-3xl font-bold text-[var(--foreground)] mt-1 font-mono tabular-nums">
                  ¥{totalPaidAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--foreground-secondary)]">已支付订单数</p>
              <p className="text-2xl font-bold text-[var(--primary)] mt-1 font-mono tabular-nums">
                {paidOrderCount}
              </p>
            </div>
          </div>
        </GlowCard>
      </div>
    </div>
  )
}
