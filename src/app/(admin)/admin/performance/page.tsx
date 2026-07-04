"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Trophy, Target, TrendingUp, TrendingDown, Clock, DollarSign, Users, Award, ChevronDown, ChevronUp, Download } from "lucide-react"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { HudPanel } from "@/components/futuristic/HudPanel"
import { EnergyRing } from "@/components/futuristic/EnergyRing"
import { apiFetch } from "@/lib/api-fetch"

interface PerformanceStats {
  totalRevenue: number
  avgConversionRate: number
  avgCompletionRate: number
  totalDeals: number
  teamRanking: Array<{
    rank: number
    id: string
    name: string
    avatar: string
    customers: number
    converted: number
    revenue: number
    conversionRate: number
    completionRate: number
    responseRate: number
    trend: "up" | "down" | "stable"
    trendValue: number
  }>
  periodStats: Array<{
    period: string
    revenue: number
    deals: number
    conversionRate: number
  }>
  kpiTargets: Array<{
    name: string
    target: number
    current: number
    unit: string
    progress: number
  }>
}

export default function PerformancePage() {
  const [stats, setStats] = useState<PerformanceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState("month")
  const [sortBy, setSortBy] = useState<"revenue" | "conversion" | "completion">("revenue")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const fetchPerformanceData = async () => {
    try {
      const res = await apiFetch(`/api/admin/performance?period=${selectedPeriod}`)
      const result = await res.json()
      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error("获取绩效数据失败:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPerformanceData()
  }, [selectedPeriod])

  const handleSort = (field: "revenue" | "conversion" | "completion") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("desc")
    }
  }

  const handleExport = () => {
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    window.location.href = `/api/export/performance?month=${month}&period=${selectedPeriod}`
  }

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

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-[var(--warning)]" />
      case 2:
        return <Award className="w-5 h-5 text-[var(--foreground-secondary)]" />
      case 3:
        return <Award className="w-5 h-5 text-[var(--accent)]" />
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-[var(--foreground-secondary)]">{rank}</span>
    }
  }

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-[var(--warning)]/20 to-transparent border-l-2 border-[var(--warning)]"
      case 2:
        return "bg-gradient-to-r from-[var(--foreground-secondary)]/10 to-transparent border-l-2 border-[var(--foreground-secondary)]"
      case 3:
        return "bg-gradient-to-r from-[var(--accent)]/10 to-transparent border-l-2 border-[var(--accent)]"
      default:
        return ""
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">绩效考核</h1>
            <p className="text-[var(--foreground-secondary)] mt-1">追踪咨询师团队绩效，优化团队管理</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] rounded-lg font-medium hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
            <div className="flex items-center gap-2 p-1 bg-[var(--background)]/50 rounded-lg">
              {["week", "month", "quarter", "year"].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    selectedPeriod === period
                      ? "bg-[var(--primary)] text-[var(--background)]"
                      : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {period === "week" ? "本周" : period === "month" ? "本月" : period === "quarter" ? "本季度" : "本年"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <HudPanel
            label="团队总业绩"
            value={`¥${(stats?.totalRevenue || 0).toLocaleString()}`}
            icon={<DollarSign />}
            trend="up"
            trendValue="+12.5%"
          />
          <HudPanel
            label="平均转化率"
            value={(stats?.avgConversionRate || 0).toFixed(1)}
            unit="%"
            icon={<Target />}
          />
          <HudPanel
            label="平均完成率"
            value={(stats?.avgCompletionRate || 0).toFixed(1)}
            unit="%"
            icon={<TrendingUp />}
          />
          <HudPanel
            label="成交总数"
            value={stats?.totalDeals.toString() || "0"}
            icon={<Users />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <GlowCard className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-[var(--foreground)]">绩效排名</h2>
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => handleSort("revenue")}
                  className={`px-3 py-1 rounded flex items-center gap-1 ${sortBy === "revenue" ? "bg-[var(--primary)]/20 text-[var(--primary)]" : "text-[var(--foreground-secondary)] hover:bg-[var(--border)]"}`}
                >
                  业绩 {sortBy === "revenue" && (sortOrder === "desc" ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />)}
                </button>
                <button
                  onClick={() => handleSort("conversion")}
                  className={`px-3 py-1 rounded flex items-center gap-1 ${sortBy === "conversion" ? "bg-[var(--primary)]/20 text-[var(--primary)]" : "text-[var(--foreground-secondary)] hover:bg-[var(--border)]"}`}
                >
                  转化 {sortBy === "conversion" && (sortOrder === "desc" ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />)}
                </button>
                <button
                  onClick={() => handleSort("completion")}
                  className={`px-3 py-1 rounded flex items-center gap-1 ${sortBy === "completion" ? "bg-[var(--primary)]/20 text-[var(--primary)]" : "text-[var(--foreground-secondary)] hover:bg-[var(--border)]"}`}
                >
                  完成 {sortBy === "completion" && (sortOrder === "desc" ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />)}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">排名</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">咨询师</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">客户数</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">成交数</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">转化率</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">完成率</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">业绩</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">趋势</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.teamRanking.map((member, index) => (
                    <motion.tr
                      key={member.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`border-b border-[var(--border)] last:border-0 ${getRankBg(member.rank)}`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {getRankIcon(member.rank)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] font-medium">
                            {member.name[0]}
                          </div>
                          <span className="font-medium text-[var(--foreground)]">{member.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right text-[var(--foreground)]">{member.customers}</td>
                      <td className="py-4 px-4 text-right text-[var(--foreground)]">{member.converted}</td>
                      <td className="py-4 px-4 text-right">
                        <span className={`font-medium ${member.conversionRate >= 70 ? "text-[var(--success)]" : member.conversionRate >= 60 ? "text-[var(--warning)]" : "text-[var(--danger)]"}`}>
                          {member.conversionRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12 h-1.5 bg-[var(--card)] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${member.completionRate}%`, backgroundColor: member.completionRate >= 80 ? "var(--success)" : member.completionRate >= 60 ? "var(--warning)" : "var(--danger)" }}
                            />
                          </div>
                          <span className="text-sm text-[var(--foreground-secondary)]">{member.completionRate.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-medium text-[var(--foreground)]">
                        ¥{member.revenue.toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className={`flex items-center justify-end gap-1 text-sm ${member.trend === "up" ? "text-[var(--success)]" : member.trend === "down" ? "text-[var(--danger)]" : "text-[var(--foreground-secondary)]"}`}>
                          {member.trend === "up" ? <TrendingUp className="w-4 h-4" /> : member.trend === "down" ? <TrendingDown className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          {member.trendValue > 0 ? `+${member.trendValue}%` : `${member.trendValue}%`}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                  {(!stats?.teamRanking || stats.teamRanking.length === 0) && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[var(--foreground-secondary)]">暂无绩效数据</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlowCard>

          <div className="space-y-6">
            <GlowCard className="p-6">
              <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">KPI 目标</h2>
              <div className="space-y-4">
                {stats?.kpiTargets.map((kpi, index) => (
                  <motion.div
                    key={kpi.name}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[var(--foreground)]">{kpi.name}</span>
                      <span className="text-sm font-medium">
                        {kpi.current} {kpi.unit} / {kpi.target} {kpi.unit}
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--card)] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(kpi.progress, 100)}%` }}
                        transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: kpi.progress >= 100 ? "var(--success)" : kpi.progress >= 80 ? "var(--primary)" : kpi.progress >= 60 ? "var(--warning)" : "var(--danger)" }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-[var(--foreground-secondary)]">{kpi.progress.toFixed(0)}%</span>
                      {kpi.progress >= 100 && (
                        <span className="text-xs text-[var(--success)]">已达成</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlowCard>

            <GlowCard className="p-6">
              <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">周期趋势</h2>
              <div className="h-[200px]">
                {stats?.periodStats && stats.periodStats.length > 0 ? (
                  <div className="flex items-end justify-between h-full gap-2">
                    {stats.periodStats.map((item, index) => (
                      <motion.div
                        key={item.period}
                        initial={{ height: 0 }}
                        animate={{ height: `${(item.revenue / Math.max(...stats.periodStats.map(s => s.revenue))) * 100}%` }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                        className="flex-1 relative group"
                      >
                        <div className="w-full bg-gradient-to-t from-[var(--accent)]/60 to-[var(--accent)]/30 rounded-t-lg" />
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-[var(--foreground-secondary)] whitespace-nowrap">
                          {item.period}
                        </div>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-medium text-[var(--foreground)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          ¥{item.revenue.toLocaleString()}
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

            {stats?.teamRanking && stats.teamRanking.length > 0 && (
              <GlowCard className="p-6">
                <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">Top 3 绩效</h2>
                <div className="space-y-4">
                  {stats.teamRanking.slice(0, 3).map((member, index) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg ${index === 0 ? "bg-[var(--warning)]/10 border border-[var(--warning)]/30" : index === 1 ? "bg-[var(--foreground-secondary)]/10 border border-[var(--foreground-secondary)]/30" : "bg-[var(--accent)]/10 border border-[var(--accent)]/30"}`}
                    >
                      <div className="flex items-center gap-3">
                        <EnergyRing
                          value={member.conversionRate}
                          variant={index === 0 ? "warning" : index === 1 ? "primary" : "accent"}
                          size={48}
                          label=""
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {getRankIcon(index + 1)}
                            <span className="font-medium text-[var(--foreground)]">{member.name}</span>
                          </div>
                          <div className="text-sm text-[var(--foreground-secondary)] mt-1">
                            {member.converted} 成交 / {member.customers} 客户
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">¥{member.revenue.toLocaleString()}</p>
                          <p className="text-xs text-[var(--foreground-secondary)]">{member.conversionRate.toFixed(1)}% 转化</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </GlowCard>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}