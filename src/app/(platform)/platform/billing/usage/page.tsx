"use client"

import { apiFetch } from "@/lib/api-fetch"
import { useCallback, useEffect, useMemo, useState } from "react"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { HudPanel } from "@/components/futuristic/HudPanel"
import {
  AlertCircle,
  BarChart3,
  HardDrive,
  Mic,
  RefreshCw,
  Users,
  Zap,
} from "lucide-react"

interface UsagePoint {
  date: string
  value: number
}

interface DailyRow {
  date: string
  [key: string]: number | string
}

interface UsageSeries {
  type: string
  data: UsagePoint[]
}

interface UsageData {
  series: UsageSeries[]
  days: string[]
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string }
}

interface OrganizationOption {
  id: string
  name: string
}

const USAGE_TYPE_META: Record<
  string,
  { label: string; unit: string; icon: React.ReactNode; color: string }
> = {
  asr_hours: {
    label: "ASR 转写时长",
    unit: "小时",
    icon: <Mic className="w-4 h-4" />,
    color: "var(--primary)",
  },
  ai_calls: {
    label: "AI 调用次数",
    unit: "次",
    icon: <Zap className="w-4 h-4" />,
    color: "var(--accent)",
  },
  storage_gb: {
    label: "存储使用量",
    unit: "GB",
    icon: <HardDrive className="w-4 h-4" />,
    color: "var(--success)",
  },
  active_users: {
    label: "活跃用户数",
    unit: "人",
    icon: <Users className="w-4 h-4" />,
    color: "var(--warning)",
  },
}

const USAGE_TYPE_ORDER = ["asr_hours", "ai_calls", "storage_gb", "active_users"]

export default function UsagePage() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string>("all")
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([])

  const fetchUsage = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = new URL("/api/platform/usage", window.location.origin)
      if (orgId !== "all") {
        url.searchParams.set("orgId", orgId)
      }
      const res = await apiFetch(url.toString())
      const json: ApiResponse<UsageData> = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "获取使用统计失败")
      }
      setUsage(json.data || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取使用统计失败")
    } finally {
      setLoading(false)
    }
  }, [orgId])

  const fetchOrganizations = useCallback(async () => {
    try {
      const res = await apiFetch("/api/platform/organizations")
      const json: ApiResponse<{ organizations: OrganizationOption[]; pagination: unknown }> = await res.json()
      if (json.success && json.data?.organizations) {
        setOrganizations(json.data.organizations)
      }
    } catch {
      // 机构列表加载失败不阻塞主流程
    }
  }, [])

  useEffect(() => {
    fetchOrganizations()
  }, [fetchOrganizations])

  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  // 计算最近 30 天各类型的总量
  const totals = useMemo(() => {
    const result: Record<string, number> = {}
    if (usage?.series) {
      for (const series of usage.series) {
        const sum = series.data.reduce((acc, point) => acc + point.value, 0)
        result[series.type] = sum
      }
    }
    return result
  }, [usage])

  // 按日期聚合所有类型的日合计，用于表格展示
  const dailyRows = useMemo(() => {
    if (!usage) return []
    const byDate = new Map<string, DailyRow>()
    for (const series of usage.series) {
      for (const point of series.data) {
        const existing = byDate.get(point.date)
        const row: DailyRow = existing || { date: point.date }
        const prev = typeof row[series.type] === "number" ? (row[series.type] as number) : 0
        row[series.type] = prev + point.value
        byDate.set(point.date, row)
      }
    }
    return Array.from(byDate.values()).sort((a, b) =>
      a.date < b.date ? 1 : -1,
    )
  }, [usage])

  const handleOrgChange = (value: string) => {
    setOrgId(value)
  }

  const formatValue = (type: string, value: number) => {
    if (type === "asr_hours" || type === "storage_gb") {
      return value.toFixed(2)
    }
    return Math.round(value).toString()
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">用量统计</h1>
            <p className="text-[var(--foreground-secondary)] mt-1">
              全平台最近 30 天资源使用情况
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={orgId}
              onChange={(e) => handleOrgChange(e.target.value)}
              className="px-4 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all min-w-[180px]"
            >
              <option value="all">全部机构</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            <button
              onClick={fetchUsage}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              刷新
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[var(--danger)] flex-shrink-0" />
            <p className="text-sm text-[var(--danger)]">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-[var(--foreground-secondary)]">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
            加载中...
          </div>
        ) : !usage || usage.series.length === 0 ? (
          <GlowCard variant="primary" className="p-12 text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-[var(--foreground-secondary)]/50" />
            <p className="text-[var(--foreground-secondary)]">暂无使用统计数据</p>
          </GlowCard>
        ) : (
          <>
            {/* 4 个统计卡片（最近 30 天总量） */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {USAGE_TYPE_ORDER.map((type) => {
                const meta = USAGE_TYPE_META[type]
                const total = totals[type] || 0
                return (
                  <HudPanel
                    key={type}
                    label={meta.label}
                    value={formatValue(type, total)}
                    unit={meta.unit}
                    icon={meta.icon}
                  />
                )
              })}
            </div>

            {/* 每日明细表 */}
            <GlowCard variant="primary" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-medium text-[var(--foreground)]">
                    每日使用明细
                  </h2>
                  <p className="text-xs text-[var(--foreground-secondary)] mt-1">
                    最近 {dailyRows.length} 天的按日聚合数据
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">
                        日期
                      </th>
                      {USAGE_TYPE_ORDER.map((type) => (
                        <th
                          key={type}
                          className="text-right py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]"
                        >
                          {USAGE_TYPE_META[type].label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dailyRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={USAGE_TYPE_ORDER.length + 1}
                          className="py-12 text-center text-[var(--foreground-secondary)]"
                        >
                          <BarChart3 className="w-10 h-10 mx-auto mb-2 text-[var(--foreground-secondary)]/50" />
                          暂无每日记录
                        </td>
                      </tr>
                    ) : (
                      dailyRows.map((row) => (
                        <tr
                          key={row.date}
                          className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]/30 transition-colors"
                        >
                          <td className="py-2.5 px-4 text-sm text-[var(--foreground)] font-mono">
                            {row.date}
                          </td>
                          {USAGE_TYPE_ORDER.map((type) => {
                            const meta = USAGE_TYPE_META[type]
                            const raw = row[type]
                            const value = typeof raw === "number" ? raw : 0
                            return (
                              <td
                                key={type}
                                className="py-2.5 px-4 text-right font-mono text-sm tabular-nums"
                                style={{ color: value > 0 ? meta.color : "var(--foreground-muted)" }}
                              >
                                {value > 0 ? formatValue(type, value) : "—"}
                                {value > 0 && (
                                  <span className="text-xs text-[var(--foreground-muted)] ml-1">
                                    {meta.unit}
                                  </span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </GlowCard>
          </>
        )}
      </div>
    </div>
  )
}
