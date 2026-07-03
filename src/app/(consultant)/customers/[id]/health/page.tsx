"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import ReactECharts from "echarts-for-react"
import {
  ArrowLeft,
  Activity,
  RefreshCw,
  Loader2,
  User,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Phone,
  MessageCircle,
  Mail,
  Store,
  FileAudio,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldAlert,
  Lightbulb,
} from "lucide-react"
import Link from "next/link"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { EnergyRing } from "@/components/futuristic/EnergyRing"
import { TagCapsule } from "@/components/futuristic/TagCapsule"

// ============ 类型定义 ============

interface CustomerInfo {
  id: string
  name: string
  phone: string | null
  wechat: string | null
  status: string
  tier: string | null
  healthScore: number | null
}

interface HealthDimensions {
  interactionFrequency: number
  recency: number
  satisfaction: number
  consumption: number
  repurchase: number
  activity: number
}

interface RescueStrategy {
  summary: string
  actions: string[]
  priority: "high" | "medium" | "low"
  bestChannel: "wechat" | "phone" | "in_store"
  timing: string
}

// 最新一条完整记录（API 已将 JSON 字段解析为对象/数组）
interface LatestHealthRecord {
  id: string
  score: number
  level: string
  dimensions: HealthDimensions | null
  trend: string | null
  riskReasons: string[]
  rescueStrategy: RescueStrategy | null
  evaluatedAt: string
  createdAt: string
}

// 历史轻量记录（仅用于趋势图）
interface HistoryLightItem {
  id: string
  score: number
  level: string
  trend: string | null
  evaluatedAt: string
}

interface InteractionRecord {
  id: string
  channel: string
  direction: string
  duration: number | null
  content: string | null
  summary: string | null
  hasReply: boolean
  replyTime: number | null
  occurredAt: string
}

interface HealthApiResponse {
  current: number | null // customer.healthScore 原始数字
  latest: LatestHealthRecord | null
  history: HistoryLightItem[]
}

// ============ 静态配置 ============

const levelConfig: Record<
  string,
  { label: string; variant: "success" | "primary" | "warning" | "danger"; color: string }
> = {
  healthy: { label: "健康", variant: "success", color: "var(--success)" },
  good: { label: "良好", variant: "primary", color: "var(--primary)" },
  warning: { label: "预警", variant: "warning", color: "var(--warning)" },
  danger: { label: "危险", variant: "danger", color: "var(--danger)" },
}

const dimensionLabels: Record<keyof HealthDimensions, string> = {
  interactionFrequency: "互动频率",
  recency: "最近活跃",
  satisfaction: "满意度",
  consumption: "消费活跃",
  repurchase: "复购意愿",
  activity: "参与度",
}

const channelConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  wechat: { label: "微信", icon: <MessageCircle className="w-3.5 h-3.5" />, color: "var(--success)" },
  phone: { label: "电话", icon: <Phone className="w-3.5 h-3.5" />, color: "var(--primary)" },
  in_store: { label: "到店", icon: <Store className="w-3.5 h-3.5" />, color: "var(--accent)" },
  recording: { label: "录音", icon: <FileAudio className="w-3.5 h-3.5" />, color: "var(--warning)" },
  campaign: { label: "活动", icon: <Mail className="w-3.5 h-3.5" />, color: "var(--danger)" },
  email: { label: "邮件", icon: <Mail className="w-3.5 h-3.5" />, color: "var(--primary)" },
}

const statusMap: Record<string, { label: string; color: string }> = {
  lead: { label: "线索", color: "var(--accent)" },
  contacted: { label: "已联系", color: "var(--primary)" },
  negotiating: { label: "洽谈中", color: "var(--warning)" },
  converted: { label: "已成交", color: "var(--success)" },
  churned: { label: "已流失", color: "var(--danger)" },
}

// ============ 工具函数 ============

function cssVar(name: string): string {
  if (typeof window === "undefined") return ""
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function getLevel(score: number): { label: string; variant: "success" | "primary" | "warning" | "danger"; color: string } {
  if (score >= 80) return levelConfig.healthy
  if (score >= 60) return levelConfig.good
  if (score >= 40) return levelConfig.warning
  return levelConfig.danger
}

const priorityConfig: Record<string, { label: string; variant: "danger" | "warning" | "primary" }> = {
  high: { label: "高优先级", variant: "danger" },
  medium: { label: "中优先级", variant: "warning" },
  low: { label: "低优先级", variant: "primary" },
}

// ============ 页面组件 ============

export default function HealthPage() {
  const params = useParams<{ id: string }>()
  const customerId = params.id

  const [customer, setCustomer] = useState<CustomerInfo | null>(null)
  const [healthData, setHealthData] = useState<HealthApiResponse | null>(null)
  const [interactions, setInteractions] = useState<InteractionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [customerRes, healthRes, interactionsRes] = await Promise.all([
        fetch(`/api/customers/${customerId}`),
        fetch(`/api/customers/${customerId}/health`),
        fetch(`/api/customers/${customerId}/interactions?pageSize=20`),
      ])

      const customerResult = await customerRes.json()
      const healthResult = await healthRes.json()
      const interactionsResult = await interactionsRes.json()

      if (customerResult.success) {
        setCustomer(customerResult.data)
      }
      if (healthResult.success) {
        setHealthData(healthResult.data)
      } else {
        setError(healthResult.error?.message || "获取健康度数据失败")
      }
      if (interactionsResult.success) {
        const data = interactionsResult.data
        // API 返回 { items, total, page, pageSize, totalPages }
        setInteractions(Array.isArray(data?.items) ? data.items : [])
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "获取数据失败"
      setError(msg)
      console.error("获取健康度数据失败:", e)
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRecalculate = async () => {
    setRecalculating(true)
    setError(null)
    try {
      const res = await fetch(`/api/customers/${customerId}/health`, { method: "POST" })
      const result = await res.json()
      if (!result.success) {
        throw new Error(result.error?.message || "重新评估失败")
      }
      await fetchData()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "重新评估失败"
      setError(msg)
      console.error("重新评估健康度失败:", e)
    } finally {
      setRecalculating(false)
    }
  }

  // 当前最新完整记录（API 已解析 JSON 字段）
  const latestRecord = healthData?.latest ?? null
  const dimensions = useMemo(() => latestRecord?.dimensions ?? null, [latestRecord])
  const riskReasons = useMemo(() => latestRecord?.riskReasons ?? [], [latestRecord])
  const rescueStrategy = latestRecord?.rescueStrategy ?? null
  // 优先使用 latest.score（评估得分），回退到 customer.healthScore
  const score = latestRecord?.score ?? healthData?.current ?? customer?.healthScore ?? 0
  const levelInfo = getLevel(score)

  // ============ ECharts 配置 ============

  const radarOption = useMemo(() => {
    if (!dimensions) return null
    const c = {
      fg: cssVar("--foreground"),
      fgSecondary: cssVar("--foreground-secondary"),
      primary: cssVar("--primary"),
      accent: cssVar("--accent"),
      success: cssVar("--success"),
      warning: cssVar("--warning"),
      danger: cssVar("--danger"),
    }
    const indicators = (Object.keys(dimensionLabels) as Array<keyof HealthDimensions>).map(
      (key) => ({ name: dimensionLabels[key], max: 100 })
    )
    const values = (Object.keys(dimensionLabels) as Array<keyof HealthDimensions>).map(
      (key) => Number(dimensions[key] ?? 0)
    )
    return {
      tooltip: {
        backgroundColor: cssVar("--background-secondary"),
        borderColor: c.primary,
        textStyle: { color: c.fg },
      },
      radar: {
        indicator: indicators,
        radius: "65%",
        axisName: { color: c.fgSecondary, fontSize: 12 },
        splitLine: { lineStyle: { color: "rgba(232,237,245,0.1)" } },
        splitArea: { areaStyle: { color: ["rgba(0,229,255,0.02)", "rgba(124,77,255,0.04)"] } },
        axisLine: { lineStyle: { color: "rgba(232,237,245,0.1)" } },
      },
      series: [
        {
          type: "radar",
          data: [
            {
              value: values,
              name: "健康度分项",
              areaStyle: { color: "rgba(0,229,255,0.2)" },
              lineStyle: { color: c.primary, width: 2 },
              itemStyle: { color: c.accent },
            },
          ],
        },
      ],
    }
  }, [dimensions])

  const trendOption = useMemo(() => {
    const history = healthData?.history ?? []
    if (history.length === 0) return null
    // 倒序排列 -> 升序展示
    const sorted = [...history].sort(
      (a, b) => new Date(a.evaluatedAt).getTime() - new Date(b.evaluatedAt).getTime()
    )
    const c = {
      fg: cssVar("--foreground"),
      fgSecondary: cssVar("--foreground-secondary"),
      primary: cssVar("--primary"),
      accent: cssVar("--accent"),
      success: cssVar("--success"),
      warning: cssVar("--warning"),
      danger: cssVar("--danger"),
    }
    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: cssVar("--background-secondary"),
        borderColor: c.primary,
        textStyle: { color: c.fg },
      },
      grid: { left: 40, right: 20, top: 30, bottom: 30 },
      xAxis: {
        type: "category",
        data: sorted.map((h) =>
          new Date(h.evaluatedAt).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })
        ),
        axisLine: { lineStyle: { color: "rgba(232,237,245,0.1)" } },
        axisLabel: { color: c.fgSecondary, fontSize: 11 },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        axisLine: { lineStyle: { color: "rgba(232,237,245,0.1)" } },
        axisLabel: { color: c.fgSecondary, fontSize: 11 },
        splitLine: { lineStyle: { color: "rgba(232,237,245,0.06)" } },
      },
      series: [
        {
          name: "健康度",
          type: "line",
          smooth: true,
          data: sorted.map((h) => Number(h.score.toFixed(1))),
          lineStyle: { color: c.primary, width: 3 },
          itemStyle: { color: c.accent },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(0,229,255,0.3)" },
                { offset: 1, color: "rgba(0,229,255,0)" },
              ],
            },
          },
        },
      ],
    }
  }, [healthData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <div className="w-10 h-10 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const statusInfo = customer ? statusMap[customer.status] || statusMap.lead : null

  return (
    <div className="p-8">
      {/* 顶部导航 + 标题 */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href={`/customers/${customerId}`}
            className="flex items-center gap-2 text-[var(--foreground-secondary)] hover:text-[var(--primary)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回客户详情
          </Link>
          <h1 className="font-mono text-2xl font-bold tracking-wider text-[var(--primary)] flex items-center gap-2">
            <Activity className="w-6 h-6 text-[var(--success)]" />
            客户健康度
          </h1>
        </div>
        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--success)]/20 text-[var(--success)] hover:bg-[var(--success)]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {recalculating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              评估中...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              重新评估
            </>
          )}
        </button>
      </header>

      {error && (
        <GlowCard variant="danger" className="p-4 mb-6">
          <div className="flex items-center gap-2 text-[var(--danger)]">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </GlowCard>
      )}

      {/* 顶部：客户摘要 + 健康度环 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <GlowCard variant="primary" className="p-6 lg:col-span-2">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-12 h-12 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
              <User className="w-6 h-6 text-[var(--primary)]" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-bold text-[var(--foreground)]">
                  {customer?.name ?? "未知客户"}
                </span>
                {statusInfo && (
                  <span
                    className="px-2 py-0.5 rounded text-xs"
                    style={{ backgroundColor: `${statusInfo.color}20`, color: statusInfo.color }}
                  >
                    {statusInfo.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-[var(--foreground-secondary)] mt-1">
                {customer?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {customer.phone}
                  </span>
                )}
                {customer?.wechat && (
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    {customer.wechat}
                  </span>
                )}
                {latestRecord && (
                  <span className="text-xs text-[var(--foreground-muted)]">
                    最近评估：{new Date(latestRecord.evaluatedAt).toLocaleString("zh-CN")}
                  </span>
                )}
              </div>
            </div>

            {/* 趋势标识 */}
            {latestRecord?.trend && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--background)]/60 border border-[var(--border)]">
                {latestRecord.trend === "up" && (
                  <TrendingUp className="w-4 h-4 text-[var(--success)]" />
                )}
                {latestRecord.trend === "down" && (
                  <TrendingDown className="w-4 h-4 text-[var(--danger)]" />
                )}
                {latestRecord.trend === "stable" && (
                  <Minus className="w-4 h-4 text-[var(--warning)]" />
                )}
                <span className="text-xs text-[var(--foreground-secondary)]">
                  {latestRecord.trend === "up"
                    ? "上升趋势"
                    : latestRecord.trend === "down"
                    ? "下降趋势"
                    : "保持稳定"}
                </span>
              </div>
            )}
          </div>
        </GlowCard>

        {/* 健康度分数环 */}
        <GlowCard variant={levelInfo.variant} className="p-6">
          <div className="flex items-center gap-4">
            <EnergyRing
              value={score}
              size={100}
              strokeWidth={10}
              variant={levelInfo.variant}
              label="健康度"
            />
            <div>
              <div className="text-xs text-[var(--foreground-secondary)] uppercase tracking-wider mb-1">
                当前等级
              </div>
              <TagCapsule
                label={levelInfo.label}
                variant={levelInfo.variant}
                size="lg"
              />
              <div className="text-2xl font-bold font-mono mt-2" style={{ color: levelInfo.color }}>
                {score.toFixed(0)}
                <span className="text-sm font-normal text-[var(--foreground-muted)] ml-1">
                  / 100
                </span>
              </div>
            </div>
          </div>
        </GlowCard>
      </div>

      {/* 中部：雷达图 + 趋势曲线 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <GlowCard variant="accent" className="p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--foreground-secondary)] mb-4">
            6 维度分项得分
          </h3>
          {radarOption ? (
            <ReactECharts option={radarOption} style={{ height: "300px" }} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[var(--foreground-muted)] text-sm">
              暂无分项数据
            </div>
          )}
        </GlowCard>

        <GlowCard variant="primary" className="p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--foreground-secondary)] mb-4">
            健康度趋势（最近 {healthData?.history?.length ?? 0} 次评估）
          </h3>
          {trendOption ? (
            <ReactECharts option={trendOption} style={{ height: "300px" }} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[var(--foreground-muted)] text-sm">
              暂无趋势数据，至少需要 1 次评估记录
            </div>
          )}
        </GlowCard>
      </div>

      {/* 风险分析卡片（score < 60 才显示） */}
      {score < 60 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <GlowCard variant="danger" className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-5 h-5 text-[var(--danger)]" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--foreground-secondary)]">
                风险原因
              </h3>
            </div>
            {riskReasons.length > 0 ? (
              <ul className="space-y-2">
                {riskReasons.map((reason, idx) => (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-start gap-2 text-sm text-[var(--foreground)]"
                  >
                    <span className="text-[var(--danger)] mt-0.5">•</span>
                    <span>{reason}</span>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--foreground-muted)] italic">
                暂无具体风险原因，建议尽快安排回访了解客户状态
              </p>
            )}
          </GlowCard>

          <GlowCard variant="warning" className="p-5">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Lightbulb className="w-5 h-5 text-[var(--warning)]" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--foreground-secondary)]">
                挽回策略建议
              </h3>
              {rescueStrategy && (
                <TagCapsule
                  label={priorityConfig[rescueStrategy.priority]?.label ?? rescueStrategy.priority}
                  variant={priorityConfig[rescueStrategy.priority]?.variant ?? "warning"}
                  size="sm"
                />
              )}
            </div>
            {rescueStrategy ? (
              <div className="space-y-3">
                <p className="text-sm text-[var(--foreground)] leading-relaxed">
                  {rescueStrategy.summary}
                </p>
                {rescueStrategy.actions.length > 0 && (
                  <div>
                    <p className="text-xs text-[var(--foreground-secondary)] uppercase tracking-wider mb-2">
                      建议行动
                    </p>
                    <ul className="space-y-1.5">
                      {rescueStrategy.actions.map((action, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm text-[var(--foreground-secondary)]"
                        >
                          <span className="text-[var(--warning)] mt-0.5">›</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex items-center gap-3 pt-2 text-xs text-[var(--foreground-muted)]">
                  <span>
                    最佳渠道：
                    <span className="text-[var(--primary)]">
                      {channelConfig[rescueStrategy.bestChannel]?.label ?? rescueStrategy.bestChannel}
                    </span>
                  </span>
                  <span>·</span>
                  <span>时机：{rescueStrategy.timing}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--foreground-muted)] italic">
                暂无策略建议，建议结合最新画像报告制定跟进计划
              </p>
            )}
          </GlowCard>
        </div>
      )}

      {/* 互动时间线 */}
      <GlowCard variant="primary" className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--foreground-secondary)]">
            最近互动记录
          </h3>
          <Link
            href={`/customers/${customerId}/interactions`}
            className="text-xs text-[var(--primary)] hover:underline"
          >
            查看全部 →
          </Link>
        </div>

        {interactions.length > 0 ? (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--border)]" />
            <div className="space-y-3">
              {interactions.map((item, idx) => {
                const channel = channelConfig[item.channel] || {
                  label: item.channel,
                  icon: <Mail className="w-3.5 h-3.5" />,
                  color: "var(--foreground-secondary)",
                }
                const isOutbound = item.direction === "consultant_initiated"
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="relative pl-10"
                  >
                    <div
                      className="absolute left-2 top-2 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${channel.color}20`, color: channel.color }}
                    >
                      {channel.icon}
                    </div>
                    <div className="p-3 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors">
                      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-medium"
                            style={{ color: channel.color }}
                          >
                            {channel.label}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
                              isOutbound
                                ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                                : "bg-[var(--accent)]/10 text-[var(--accent)]"
                            }`}
                          >
                            {isOutbound ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownLeft className="w-3 h-3" />
                            )}
                            {isOutbound ? "主动联系" : "客户发起"}
                          </span>
                          {item.hasReply && (
                            <span className="text-xs text-[var(--success)]">
                              已回复{item.replyTime ? ` · ${item.replyTime}分钟` : ""}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[var(--foreground-muted)]">
                          {new Date(item.occurredAt).toLocaleString("zh-CN")}
                        </span>
                      </div>
                      {(item.summary || item.content) && (
                        <p className="text-sm text-[var(--foreground-secondary)] line-clamp-2">
                          {item.summary || item.content}
                        </p>
                      )}
                      {item.duration && (
                        <p className="text-xs text-[var(--foreground-muted)] mt-1">
                          时长 {Math.floor(item.duration / 60)}分{item.duration % 60}秒
                        </p>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-[var(--foreground-muted)] text-sm">
            暂无互动记录
          </div>
        )}
      </GlowCard>
    </div>
  )
}
