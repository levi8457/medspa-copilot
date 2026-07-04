"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, AlertTriangle, Clock, Users, DollarSign, RefreshCw, User, Calendar } from "lucide-react"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { HudPanel } from "@/components/futuristic/HudPanel"
import { EnergyRing } from "@/components/futuristic/EnergyRing"
import { FunnelChart } from "@/components/FunnelChart"
import { apiFetch } from "@/lib/api-fetch"

const statusMap: Record<string, { label: string; color: string; icon: typeof TrendingUp }> = {
  lead: { label: "线索", color: "var(--accent)", icon: Users },
  contacted: { label: "已联系", color: "var(--primary)", icon: RefreshCw },
  negotiating: { label: "洽谈中", color: "var(--warning)", icon: Clock },
  converted: { label: "已成交", color: "var(--success)", icon: DollarSign },
  churned: { label: "已流失", color: "var(--danger)", icon: TrendingDown },
}

interface LifecycleStats {
  totalCustomers: number
  activeRate: number
  avgLifecycleDays: number
  churnRate: number
  stageCounts: Array<{ status: string; count: number; rate: number }>
  funnel: Array<{ name: string; value: number; rate: number }>
  retentionTrend: Array<{ period: string; value: number }>
  churnAlert: Array<{
    id: string
    name: string
    status: string
    lastContact: string
    consultant: string
    riskScore: number
  }>
}

export default function LifecyclePage() {
  const [stats, setStats] = useState<LifecycleStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchLifecycleData = async () => {
    try {
      const res = await apiFetch("/api/admin/lifecycle")
      const result = await res.json()
      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error("获取生命周期数据失败:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLifecycleData()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-8 w-48 bg-[var(--card)] animate-pulse rounded" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-[var(--card)] animate-pulse rounded-xl" />
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
          <h1 className="text-2xl font-bold text-[var(--foreground)]">客户生命周期</h1>
          <p className="text-[var(--foreground-secondary)] mt-1">追踪客户从线索到流失的完整生命周期</p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <HudPanel
            label="客户总数"
            value={stats?.totalCustomers.toLocaleString() || "0"}
            icon={<Users />}
          />
          <HudPanel
            label="活跃率"
            value={(stats?.activeRate || 0).toFixed(1)}
            unit="%"
            icon={<TrendingUp />}
          />
          <HudPanel
            label="平均周期"
            value={stats?.avgLifecycleDays.toString() || "0"}
            unit="天"
            icon={<Calendar />}
          />
          <HudPanel
            label="流失率"
            value={(stats?.churnRate || 0).toFixed(1)}
            unit="%"
            icon={<TrendingDown />}
            variant={stats?.churnRate && stats.churnRate > 10 ? "danger" : "primary"}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <GlowCard className="lg:col-span-2 p-6">
            <h2 className="text-lg font-medium text-[var(--foreground)] mb-6">转化漏斗</h2>
            {stats?.funnel && stats.funnel.length > 0 ? (
              <FunnelChart data={stats.funnel} showRate />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-[var(--foreground-secondary)]">
                暂无数据
              </div>
            )}
          </GlowCard>

          <GlowCard className="p-6">
            <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">阶段分布</h2>
            <div className="space-y-4">
              {stats?.stageCounts.map((stage, index) => {
                const stageInfo = statusMap[stage.status] || statusMap.lead
                const IconComponent = stageInfo.icon
                return (
                  <motion.div
                    key={stage.status}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4" style={{ color: stageInfo.color }} />
                        <span className="text-sm text-[var(--foreground)]">{stageInfo.label}</span>
                      </div>
                      <span className="text-sm font-medium" style={{ color: stageInfo.color }}>
                        {stage.count} ({stage.rate}%)
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--card)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${stage.rate}%`, backgroundColor: stageInfo.color }}
                      />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </GlowCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlowCard className="p-6">
            <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">留存趋势</h2>
            <div className="h-[250px]">
              {stats?.retentionTrend && stats.retentionTrend.length > 0 ? (
                <div className="flex items-end justify-between h-full gap-2">
                  {stats.retentionTrend.map((item, index) => (
                    <motion.div
                      key={item.period}
                      initial={{ height: 0 }}
                      animate={{ height: `${item.value}%` }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      className="flex-1 bg-[var(--primary)]/20 rounded-t-lg relative group"
                    >
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--primary)] to-[var(--accent)]/50 rounded-t-lg transition-all group-hover:from-[var(--primary)]/80"
                        style={{ height: `${item.value}%` }}
                      />
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-[var(--foreground-secondary)]">
                        {item.period}
                      </div>
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-[var(--foreground)] opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.value}%
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-[var(--foreground-secondary)]">
                  暂无数据
                </div>
              )}
            </div>
          </GlowCard>

          <GlowCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-[var(--foreground)]">流失预警</h2>
              <span className="flex items-center gap-1 text-sm text-[var(--danger)]">
                <AlertTriangle className="w-4 h-4" />
                {stats?.churnAlert.length || 0} 个高风险
              </span>
            </div>
            <div className="space-y-3">
              {!stats || stats.churnAlert.length === 0 ? (
                <div className="text-center text-[var(--foreground-secondary)] py-8">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 text-[var(--success)]" />
                  <p>暂无高风险客户</p>
                </div>
              ) : (
                stats.churnAlert.map((customer, index) => (
                  <motion.div
                    key={customer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-3 rounded-lg bg-[var(--danger)]/5 border border-[var(--danger)]/20 hover:border-[var(--danger)]/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <EnergyRing
                          value={customer.riskScore}
                          variant="danger"
                          size={48}
                          label=""
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[var(--foreground)]">{customer.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-[var(--danger)]/20 text-[var(--danger)]">
                              高风险
                            </span>
                          </div>
                          <div className="text-xs text-[var(--foreground-secondary)] mt-1">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {customer.consultant}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[var(--foreground-secondary)]">上次联系</p>
                        <p className="text-sm font-medium text-[var(--foreground)]">{customer.lastContact}</p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </GlowCard>
        </div>

        <GlowCard className="p-6">
          <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">生命周期矩阵</h2>
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(statusMap).map(([status, info]) => {
              const stageCount = stats?.stageCounts.find((s) => s.status === status)?.count || 0
              const IconComponent = info.icon
              return (
                <motion.div
                  key={status}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="p-4 rounded-xl text-center"
                  style={{ backgroundColor: `${info.color}10`, borderColor: `${info.color}30`, borderWidth: 1 }}
                >
                  <IconComponent className="w-8 h-8 mx-auto mb-2" style={{ color: info.color }} />
                  <p className="text-2xl font-bold mb-1" style={{ color: info.color }}>
                    {stageCount}
                  </p>
                  <p className="text-xs text-[var(--foreground-secondary)]">{info.label}</p>
                </motion.div>
              )
            })}
          </div>
          <div className="mt-6 p-4 bg-[var(--background)]/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--foreground-secondary)]">健康度</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-[var(--card)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--danger)] via-[var(--warning)] to-[var(--success)]"
                    style={{ width: `${100 - (stats?.churnRate || 0)}%` }}
                  />
                </div>
                <span className="font-medium" style={{ color: stats?.churnRate && stats.churnRate > 15 ? "var(--danger)" : stats?.churnRate && stats.churnRate > 8 ? "var(--warning)" : "var(--success)" }}>
                  {stats?.churnRate && stats.churnRate > 15 ? "需关注" : stats?.churnRate && stats.churnRate > 8 ? "正常" : "优秀"}
                </span>
              </div>
            </div>
          </div>
        </GlowCard>
      </div>
    </div>
  )
}