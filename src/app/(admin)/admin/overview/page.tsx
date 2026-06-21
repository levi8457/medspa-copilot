"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Users, TrendingUp, Target, Clock } from "lucide-react"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { HudPanel } from "@/components/futuristic/HudPanel"
import { FunnelChart } from "@/components/FunnelChart"

interface OverviewStats {
  totalCustomers: number
  newCustomers: number
  conversionRate: number
  repurchaseRate: number
  totalRevenue: number
  pendingTasks: number
  completedTasks: number
  teamPerformance: Array<{
    name: string
    customers: number
    conversionRate: number
    completionRate: number
  }>
  funnel: Array<{ name: string; value: number }>
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchOverviewStats = async () => {
    try {
      const res = await fetch("/api/admin/overview")
      const result = await res.json()
      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error("获取统计数据失败:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOverviewStats()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-8 w-48 bg-[var(--card)] animate-pulse rounded" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-[var(--card)] animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">数据指挥舱</h1>
          <p className="text-[var(--foreground-secondary)] mt-1">全局业务数据概览</p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <HudPanel
            label="客户总数"
            value={stats?.totalCustomers.toLocaleString() || "0"}
            icon={<Users />}
            trend="up"
            trendValue={`+${stats?.newCustomers || 0}`}
          />
          <HudPanel
            label="转化率"
            value={stats?.conversionRate.toString() || "0"}
            unit="%"
            icon={<TrendingUp />}
          />
          <HudPanel
            label="复购率"
            value={stats?.repurchaseRate.toString() || "0"}
            unit="%"
            icon={<Target />}
          />
          <HudPanel
            label="待跟进任务"
            value={stats?.pendingTasks.toString() || "0"}
            icon={<Clock />}
          />
        </div>

        <GlowCard variant="primary" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--foreground-secondary)]">本月营收</p>
              <p className="text-3xl font-bold text-[var(--foreground)] mt-1">
                ¥{(stats?.totalRevenue || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </GlowCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlowCard variant="accent" className="p-6">
            <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">客户漏斗</h2>
            {stats?.funnel && stats.funnel.length > 0 ? (
              <FunnelChart data={stats.funnel} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-[var(--foreground-secondary)]">
                暂无数据
              </div>
            )}
          </GlowCard>

          <GlowCard variant="accent" className="p-6">
            <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">团队业绩</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">咨询师</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">客户数</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">转化率</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">完成率</th>
                </tr>
              </thead>
              <tbody>
                {stats?.teamPerformance.map((member, index) => (
                  <motion.tr
                    key={member.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] text-sm font-medium">
                          {member.name[0]}
                        </div>
                        <span className="font-medium text-[var(--foreground)]">{member.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--foreground)]">{member.customers}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-medium ${member.conversionRate >= 70 ? "text-[var(--success)]" : member.conversionRate >= 60 ? "text-[var(--warning)]" : "text-[var(--danger)]"}`}>
                        {member.conversionRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-[var(--card)] rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--primary)] rounded-full" style={{ width: `${member.completionRate}%` }} />
                        </div>
                        <span className="text-sm text-[var(--foreground-secondary)]">{member.completionRate}%</span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {(!stats?.teamPerformance || stats.teamPerformance.length === 0) && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[var(--foreground-secondary)]">暂无团队数据</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlowCard>
        </div>
      </div>
    </div>
  )
}
