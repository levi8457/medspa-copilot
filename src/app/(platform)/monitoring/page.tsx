"use client"

import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import ReactECharts from "echarts-for-react"
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  Edit3,
  Filter,
  HardDrive,
  MessageSquare,
  Plus,
  RefreshCw,
  Save,
  Server,
  ShieldAlert,
  Tag,
  Trash2,
  X,
  Zap,
  ChevronDown,
  Send,
  User,
} from "lucide-react"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { HudPanel } from "@/components/futuristic/HudPanel"
import { EnergyRing } from "@/components/futuristic/EnergyRing"
import { TagCapsule } from "@/components/futuristic/TagCapsule"

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string }
}

interface ServiceStatus {
  name: string
  status: "healthy" | "warning" | "critical"
  uptime: number
  latency: number
}

interface AlertStats {
  pending: number
  acknowledged: number
  resolved: number
  critical: number
  warning: number
  info: number
}

interface SystemStatusData {
  services: ServiceStatus[]
  errorRate24h: number
  callCount24h: number
  activeOrgs: number
  errorRateTrend: { time: string; value: number }[]
  callCountTrend: { time: string; value: number }[]
  alertStats: AlertStats
}

interface AlertRule {
  id: string
  name: string
  metric: string
  condition: string
  threshold: number
  severity: string
  notifyChannel: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface AlertEvent {
  id: string
  ruleId: string | null
  ruleName: string
  metric: string
  value: number
  threshold: number
  severity: string
  status: string
  acknowledgedBy: string | null
  resolvedBy: string | null
  resolvedNote: string | null
  createdAt: string
  resolvedAt: string | null
}

interface Ticket {
  id: string
  orgId: string
  userId: string
  subject: string
  category: string
  priority: string
  status: string
  description: string
  assigneeId: string | null
  createdAt: string
  updatedAt: string
  closedAt: string | null
  organization?: { id: string; name: string }
  user?: { id: string; name: string | null; email: string }
  assignee?: { id: string; name: string | null; email: string } | null
  messages?: TicketMessage[]
}

interface TicketMessage {
  id: string
  ticketId: string
  senderId: string | null
  senderRole: string
  content: string
  createdAt: string
  sender?: { id: string; name: string | null; email: string }
}

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

type TabType = "system" | "alerts" | "tickets"

const inputClass =
  "w-full px-4 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"

const labelClass =
  "block text-sm font-medium text-[var(--foreground-secondary)] mb-2"

type GlowVariant = "primary" | "accent" | "success" | "warning" | "danger"

const severityVariant: Record<string, GlowVariant> = {
  info: "primary",
  warning: "warning",
  critical: "danger",
}

const statusVariant: Record<string, GlowVariant> = {
  pending: "warning",
  acknowledged: "primary",
  resolved: "success",
  ignored: "accent",
  processing: "accent",
  closed: "accent",
}

const priorityVariant: Record<string, GlowVariant> = {
  low: "accent",
  normal: "primary",
  high: "warning",
  urgent: "danger",
}

const severityLabel: Record<string, string> = {
  info: "提示",
  warning: "警告",
  critical: "严重",
}

const statusLabel: Record<string, string> = {
  pending: "待处理",
  acknowledged: "已确认",
  resolved: "已解决",
  ignored: "已忽略",
  processing: "处理中",
  closed: "已关闭",
}

const priorityLabel: Record<string, string> = {
  low: "低",
  normal: "普通",
  high: "高",
  urgent: "紧急",
}

const categoryLabel: Record<string, string> = {
  billing: "计费问题",
  technical: "技术问题",
  feature_request: "功能建议",
  other: "其他",
}

const metricLabel: Record<string, string> = {
  error_rate: "错误率",
  queue_backlog: "队列积压",
  api_latency: "API 延迟",
  db_connections: "数据库连接数",
  disk_usage: "磁盘使用率",
}

const conditionLabel: Record<string, string> = {
  greater_than: "大于",
  less_than: "小于",
}

const channelLabel: Record<string, string> = {
  site: "站内通知",
  sms: "短信",
  email: "邮件",
}

export default function MonitoringPage() {
  const [activeTab, setActiveTab] = useState<TabType>("system")
  const [error, setError] = useState<string | null>(null)

  const tabs = [
    { key: "system" as TabType, label: "系统监控", icon: Activity },
    { key: "alerts" as TabType, label: "告警管理", icon: Bell },
    { key: "tickets" as TabType, label: "工单管理", icon: MessageSquare },
  ]

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">监控告警</h1>
          <p className="text-[var(--foreground-secondary)] mt-1">
            系统运行状态监控、告警规则管理与工单处理
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[var(--danger)] flex-shrink-0" />
            <p className="text-sm text-[var(--danger)]">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-[var(--danger)]/70 hover:text-[var(--danger)]">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex gap-2 border-b border-[var(--border)]">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  isActive
                    ? "border-[var(--primary)] text-[var(--primary)]"
                    : "border-transparent text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === "system" && <SystemMonitorTab />}
            {activeTab === "alerts" && <AlertsTab onError={setError} />}
            {activeTab === "tickets" && <TicketsTab onError={setError} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function SystemMonitorTab() {
  const [data, setData] = useState<SystemStatusData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/platform/monitoring/status")
      const json: ApiResponse<SystemStatusData> = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "获取监控状态失败")
      }
      setData(json.data || null)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading || !data) {
    return (
      <div className="py-16 text-center text-[var(--foreground-secondary)]">
        <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
        加载中...
      </div>
    )
  }

  const errorChartOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(13, 19, 38, 0.95)",
      borderColor: "rgba(0, 229, 255, 0.3)",
      textStyle: { color: "#E8EDF5" },
      formatter: (params: { name: string; value: number }[]) =>
        `${params[0].name}<br/>错误率: <b style="color:#FF4D6A">${params[0].value.toFixed(2)}%</b>`,
    },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: "category",
      data: data.errorRateTrend.map((d) => d.time),
      axisLine: { lineStyle: { color: "rgba(232, 237, 245, 0.1)" } },
      axisLabel: { color: "#8892A8", fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      name: "%",
      nameTextStyle: { color: "#8892A8" },
      axisLine: { show: false },
      axisLabel: { color: "#8892A8", fontSize: 11 },
      splitLine: { lineStyle: { color: "rgba(232, 237, 245, 0.06)" } },
    },
    series: [
      {
        type: "line",
        data: data.errorRateTrend.map((d) => d.value),
        smooth: true,
        lineStyle: { color: "#FF4D6A", width: 2 },
        areaStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(255, 77, 106, 0.3)" },
              { offset: 1, color: "rgba(255, 77, 106, 0.02)" },
            ],
          },
        },
        itemStyle: { color: "#FF4D6A" },
        symbol: "none",
      },
    ],
  }

  const callChartOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(13, 19, 38, 0.95)",
      borderColor: "rgba(0, 229, 255, 0.3)",
      textStyle: { color: "#E8EDF5" },
      formatter: (params: { name: string; value: number }[]) =>
        `${params[0].name}<br/>调用量: <b style="color:#00E5FF">${params[0].value.toLocaleString()}</b>`,
    },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: "category",
      data: data.callCountTrend.map((d) => d.time),
      axisLine: { lineStyle: { color: "rgba(232, 237, 245, 0.1)" } },
      axisLabel: { color: "#8892A8", fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisLabel: { color: "#8892A8", fontSize: 11 },
      splitLine: { lineStyle: { color: "rgba(232, 237, 245, 0.06)" } },
    },
    series: [
      {
        type: "bar",
        data: data.callCountTrend.map((d) => d.value),
        barWidth: "60%",
        itemStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(0, 229, 255, 0.8)" },
              { offset: 1, color: "rgba(0, 229, 255, 0.2)" },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  }

  const serviceIcons: Record<string, typeof Server> = {
    "API 服务": Zap,
    "Worker 队列": Activity,
    "数据库": HardDrive,
    "OSS 存储": Server,
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.services.map((service) => {
          const Icon = serviceIcons[service.name] || Server
          const variant = service.status === "healthy" ? "success" : service.status === "warning" ? "warning" : "danger"
          const statusText = service.status === "healthy" ? "正常" : service.status === "warning" ? "警告" : "异常"
          return (
            <GlowCard key={service.name} variant={variant} className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2.5 rounded-lg"
                    style={{
                      backgroundColor: `color-mix(in srgb, var(--${variant}) 15%, transparent)`,
                      color: `var(--${variant})`,
                    }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)]">{service.name}</h3>
                    <TagCapsule label={statusText} variant={variant as "success" | "warning" | "danger"} size="sm" />
                  </div>
                </div>
                <EnergyRing value={service.uptime} max={100} size={48} strokeWidth={3} variant={variant as "success" | "warning" | "danger"} showValue={false} />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--border)]">
                <div>
                  <p className="text-xs text-[var(--foreground-secondary)]">可用率</p>
                  <p className="font-mono text-lg font-bold text-[var(--foreground)]">{service.uptime}%</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--foreground-secondary)]">延迟</p>
                  <p className="font-mono text-lg font-bold text-[var(--foreground)]">{service.latency}ms</p>
                </div>
              </div>
            </GlowCard>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <HudPanel label="24h 错误率" value={data.errorRate24h} unit="%" variant="danger" icon={<AlertTriangle className="w-4 h-4" />} trend="down" trendValue="0.08%" />
        <HudPanel label="24h 调用量" value={data.callCount24h.toLocaleString()} variant="primary" icon={<Zap className="w-4 h-4" />} trend="up" trendValue="12.5%" />
        <HudPanel label="活跃机构" value={data.activeOrgs} unit="家" variant="success" icon={<ShieldAlert className="w-4 h-4" />} trend="up" trendValue="3 家" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlowCard variant="danger" className="p-5">
          <h3 className="text-base font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[var(--danger)]" />
            24h 错误率趋势
          </h3>
          <ReactECharts option={errorChartOption} style={{ height: 220 }} notMerge={true} lazyUpdate={false} />
        </GlowCard>

        <GlowCard variant="primary" className="p-5">
          <h3 className="text-base font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--primary)]" />
            24h 调用量趋势
          </h3>
          <ReactECharts option={callChartOption} style={{ height: 220 }} notMerge={true} lazyUpdate={false} />
        </GlowCard>
      </div>

      <GlowCard variant="accent" className="p-5">
        <h3 className="text-base font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4 text-[var(--accent)]" />
          告警统计
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="text-center p-3 rounded-lg bg-[var(--background)]/50">
            <p className="text-2xl font-bold font-mono text-[var(--danger)]">{data.alertStats.critical}</p>
            <p className="text-xs text-[var(--foreground-secondary)] mt-1">严重告警</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-[var(--background)]/50">
            <p className="text-2xl font-bold font-mono text-[var(--warning)]">{data.alertStats.warning}</p>
            <p className="text-xs text-[var(--foreground-secondary)] mt-1">警告</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-[var(--background)]/50">
            <p className="text-2xl font-bold font-mono text-[var(--primary)]">{data.alertStats.info}</p>
            <p className="text-xs text-[var(--foreground-secondary)] mt-1">提示</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-[var(--background)]/50">
            <p className="text-2xl font-bold font-mono text-[var(--warning)]">{data.alertStats.pending}</p>
            <p className="text-xs text-[var(--foreground-secondary)] mt-1">待处理</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-[var(--background)]/50">
            <p className="text-2xl font-bold font-mono text-[var(--primary)]">{data.alertStats.acknowledged}</p>
            <p className="text-xs text-[var(--foreground-secondary)] mt-1">已确认</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-[var(--background)]/50">
            <p className="text-2xl font-bold font-mono text-[var(--success)]">{data.alertStats.resolved}</p>
            <p className="text-xs text-[var(--foreground-secondary)] mt-1">已解决</p>
          </div>
        </div>
      </GlowCard>
    </div>
  )
}

function AlertsTab({ onError }: { onError: (msg: string) => void }) {
  const [subTab, setSubTab] = useState<"rules" | "events">("rules")
  const [rules, setRules] = useState<AlertRule[]>([])
  const [events, setEvents] = useState<AlertEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null)
  const [eventFilter, setEventFilter] = useState({ severity: "", status: "" })
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<AlertEvent | null>(null)
  const [resolveNote, setResolveNote] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/platform/monitoring/alerts/rules")
      const json: ApiResponse<AlertRule[]> = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error?.message || "获取规则失败")
      setRules(json.data || [])
    } catch (err) {
      onError(err instanceof Error ? err.message : "获取规则失败")
    }
  }, [onError])

  const fetchEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (eventFilter.severity) params.set("severity", eventFilter.severity)
      if (eventFilter.status) params.set("status", eventFilter.status)
      const res = await fetch(`/api/platform/monitoring/alerts/events?${params.toString()}`)
      const json: ApiResponse<PaginatedResponse<AlertEvent>> = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error?.message || "获取事件失败")
      setEvents(json.data?.items || [])
    } catch (err) {
      onError(err instanceof Error ? err.message : "获取事件失败")
    }
  }, [eventFilter, onError])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchRules(), fetchEvents()])
      setLoading(false)
    }
    load()
  }, [fetchRules, fetchEvents])

  const handleRuleSubmit = async (values: RuleFormValues) => {
    const isEditing = !!editingRule
    const url = isEditing
      ? `/api/platform/monitoring/alerts/rules/${editingRule!.id}`
      : "/api/platform/monitoring/alerts/rules"
    const method = isEditing ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
    const json: ApiResponse<AlertRule> = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || (isEditing ? "更新规则失败" : "创建规则失败"))
    }
    await fetchRules()
    setShowRuleForm(false)
    setEditingRule(null)
  }

  const handleDeleteRule = async (rule: AlertRule) => {
    if (!window.confirm(`确定要删除规则「${rule.name}」吗？`)) return
    try {
      const res = await fetch(`/api/platform/monitoring/alerts/rules/${rule.id}`, { method: "DELETE" })
      const json: ApiResponse<{ id: string }> = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error?.message || "删除规则失败")
      await fetchRules()
    } catch (err) {
      onError(err instanceof Error ? err.message : "删除规则失败")
    }
  }

  const handleToggleRule = async (rule: AlertRule) => {
    try {
      const res = await fetch(`/api/platform/monitoring/alerts/rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rule.isActive }),
      })
      const json: ApiResponse<AlertRule> = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error?.message || "切换状态失败")
      await fetchRules()
    } catch (err) {
      onError(err instanceof Error ? err.message : "切换状态失败")
    }
  }

  const handleEventAction = async (event: AlertEvent, action: "acknowledge" | "resolve" | "ignore") => {
    if (action === "resolve") {
      setSelectedEvent(event)
      setResolveNote("")
      setShowResolveModal(true)
      return
    }
    setActionLoading(true)
    try {
      const status = action === "acknowledge" ? "acknowledged" : "ignored"
      const res = await fetch(`/api/platform/monitoring/alerts/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const json: ApiResponse<AlertEvent> = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error?.message || "操作失败")
      await fetchEvents()
    } catch (err) {
      onError(err instanceof Error ? err.message : "操作失败")
    } finally {
      setActionLoading(false)
    }
  }

  const handleResolve = async () => {
    if (!selectedEvent) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/platform/monitoring/alerts/events/${selectedEvent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved", resolvedNote: resolveNote }),
      })
      const json: ApiResponse<AlertEvent> = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error?.message || "解决失败")
      await fetchEvents()
      setShowResolveModal(false)
      setSelectedEvent(null)
    } catch (err) {
      onError(err instanceof Error ? err.message : "解决失败")
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          onClick={() => setSubTab("rules")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            subTab === "rules"
              ? "bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30"
              : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)] border border-transparent"
          }`}
        >
          告警规则
        </button>
        <button
          onClick={() => setSubTab("events")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            subTab === "events"
              ? "bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30"
              : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)] border border-transparent"
          }`}
        >
          告警事件
        </button>
      </div>

      {subTab === "rules" && (
        <>
          <div className="flex justify-between items-center">
            <p className="text-sm text-[var(--foreground-secondary)]">共 {rules.length} 条规则</p>
            <button
              onClick={() => { setEditingRule(null); setShowRuleForm(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
            >
              <Plus className="w-4 h-4" />
              新建规则
            </button>
          </div>

          {showRuleForm && (
            <RuleForm
              initial={editingRule ? toRuleFormValues(editingRule) : emptyRuleForm}
              isEditing={!!editingRule}
              onSubmit={handleRuleSubmit}
              onClose={() => { setShowRuleForm(false); setEditingRule(null) }}
              onError={onError}
            />
          )}

          {loading ? (
            <div className="py-16 text-center text-[var(--foreground-secondary)]">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
              加载中...
            </div>
          ) : rules.length === 0 ? (
            <GlowCard variant="primary" className="p-12 text-center">
              <Bell className="w-12 h-12 mx-auto mb-3 text-[var(--foreground-secondary)]/50" />
              <p className="text-[var(--foreground-secondary)]">暂无告警规则，点击「新建规则」开始创建</p>
            </GlowCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onEdit={() => { setEditingRule(rule); setShowRuleForm(true) }}
                  onDelete={() => handleDeleteRule(rule)}
                  onToggle={() => handleToggleRule(rule)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {subTab === "events" && (
        <>
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-2 items-center flex-wrap">
              <Filter className="w-4 h-4 text-[var(--foreground-secondary)]" />
              <select
                value={eventFilter.severity}
                onChange={(e) => setEventFilter({ ...eventFilter, severity: e.target.value })}
                className={`${inputClass} w-auto text-sm`}
              >
                <option value="">全部级别</option>
                <option value="critical">严重</option>
                <option value="warning">警告</option>
                <option value="info">提示</option>
              </select>
              <select
                value={eventFilter.status}
                onChange={(e) => setEventFilter({ ...eventFilter, status: e.target.value })}
                className={`${inputClass} w-auto text-sm`}
              >
                <option value="">全部状态</option>
                <option value="pending">待处理</option>
                <option value="acknowledged">已确认</option>
                <option value="resolved">已解决</option>
                <option value="ignored">已忽略</option>
              </select>
            </div>
            <p className="text-sm text-[var(--foreground-secondary)]">共 {events.length} 条事件</p>
          </div>

          {loading ? (
            <div className="py-16 text-center text-[var(--foreground-secondary)]">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
              加载中...
            </div>
          ) : events.length === 0 ? (
            <GlowCard variant="primary" className="p-12 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-[var(--success)]/50" />
              <p className="text-[var(--foreground-secondary)]">暂无告警事件</p>
            </GlowCard>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onAcknowledge={() => handleEventAction(event, "acknowledge")}
                  onResolve={() => handleEventAction(event, "resolve")}
                  onIgnore={() => handleEventAction(event, "ignore")}
                  loading={actionLoading}
                />
              ))}
            </div>
          )}
        </>
      )}

      {showResolveModal && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <GlowCard variant="primary" className="w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-[var(--foreground)] mb-4">标记为已解决</h3>
            <p className="text-sm text-[var(--foreground-secondary)] mb-4">
              规则：{selectedEvent.ruleName}
            </p>
            <div className="mb-4">
              <label className={labelClass}>解决备注</label>
              <textarea
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                rows={4}
                placeholder="请输入解决说明..."
                className={`${inputClass} resize-none`}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResolveModal(false)}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] transition-colors text-sm"
              >
                取消
              </button>
              <button
                onClick={handleResolve}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--success)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity text-sm"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                确认解决
              </button>
            </div>
          </GlowCard>
        </div>
      )}
    </div>
  )
}

interface RuleFormValues {
  name: string
  metric: string
  condition: "greater_than" | "less_than"
  threshold: number
  severity: "info" | "warning" | "critical"
  notifyChannel: "site" | "sms" | "email"
  isActive: boolean
}

const emptyRuleForm: RuleFormValues = {
  name: "",
  metric: "error_rate",
  condition: "greater_than",
  threshold: 0,
  severity: "warning",
  notifyChannel: "site",
  isActive: true,
}

function toRuleFormValues(rule: AlertRule) {
  return {
    name: rule.name,
    metric: rule.metric,
    condition: rule.condition as "greater_than" | "less_than",
    threshold: rule.threshold,
    severity: rule.severity as "info" | "warning" | "critical",
    notifyChannel: rule.notifyChannel as "site" | "sms" | "email",
    isActive: rule.isActive,
  }
}

function RuleCard({
  rule,
  onEdit,
  onDelete,
  onToggle,
}: {
  rule: AlertRule
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  return (
    <GlowCard
      variant={rule.isActive ? severityVariant[rule.severity] : "accent"}
      className="p-5 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[var(--foreground)] truncate">{rule.name}</h3>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <TagCapsule label={severityLabel[rule.severity] || rule.severity} variant={severityVariant[rule.severity] as "primary" | "success" | "warning" | "danger" | "accent" | "neutral"} size="sm" />
            <TagCapsule label={rule.isActive ? "启用" : "停用"} variant={rule.isActive ? "success" : "neutral"} size="sm" />
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--foreground-secondary)]">监控指标</span>
          <span className="text-[var(--foreground)] font-mono">{metricLabel[rule.metric] || rule.metric}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--foreground-secondary)]">触发条件</span>
          <span className="text-[var(--foreground)] font-mono">
            {conditionLabel[rule.condition]} {rule.threshold}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--foreground-secondary)]">通知渠道</span>
          <span className="text-[var(--foreground)]">{channelLabel[rule.notifyChannel] || rule.notifyChannel}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-[var(--border)]">
        <button
          onClick={onToggle}
          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-sm flex-1 ${
            rule.isActive
              ? "bg-[var(--warning)]/10 text-[var(--warning)] hover:bg-[var(--warning)]/20"
              : "bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20"
          }`}
        >
          {rule.isActive ? "停用" : "启用"}
        </button>
        <button
          onClick={onEdit}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors text-sm flex-1"
        >
          <Edit3 className="w-4 h-4" />
          编辑
        </button>
        <button
          onClick={onDelete}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20 transition-colors text-sm flex-1"
        >
          <Trash2 className="w-4 h-4" />
          删除
        </button>
      </div>
    </GlowCard>
  )
}

function RuleForm({
  initial,
  isEditing,
  onSubmit,
  onClose,
  onError,
}: {
  initial: typeof emptyRuleForm
  isEditing: boolean
  onSubmit: (values: typeof emptyRuleForm) => Promise<void>
  onClose: () => void
  onError: (msg: string) => void
}) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      onError("请填写规则名称")
      return
    }
    setSaving(true)
    try {
      await onSubmit(form)
    } catch (err) {
      onError(err instanceof Error ? err.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <GlowCard variant="accent" intensity="high" className="p-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
            {isEditing ? <Edit3 className="w-5 h-5 text-[var(--primary)]" /> : <Plus className="w-5 h-5 text-[var(--primary)]" />}
            {isEditing ? "编辑告警规则" : "新建告警规则"}
          </h2>
          <button type="button" onClick={onClose} className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>规则名称 *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="如：API 错误率过高告警"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>监控指标</label>
            <select
              value={form.metric}
              onChange={(e) => setForm({ ...form, metric: e.target.value })}
              className={inputClass}
            >
              <option value="error_rate">错误率 (%)</option>
              <option value="api_latency">API 延迟 (ms)</option>
              <option value="db_connections">数据库连接数</option>
              <option value="queue_backlog">队列积压数</option>
              <option value="disk_usage">磁盘使用率 (%)</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>告警级别</label>
            <select
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value as "info" | "warning" | "critical" })}
              className={inputClass}
            >
              <option value="info">提示</option>
              <option value="warning">警告</option>
              <option value="critical">严重</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>触发条件</label>
            <select
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value as "greater_than" | "less_than" })}
              className={inputClass}
            >
              <option value="greater_than">大于</option>
              <option value="less_than">小于</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>阈值</label>
            <input
              type="number"
              step="any"
              value={form.threshold}
              onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>通知渠道</label>
            <select
              value={form.notifyChannel}
              onChange={(e) => setForm({ ...form, notifyChannel: e.target.value as "site" | "sms" | "email" })}
              className={inputClass}
            >
              <option value="site">站内通知</option>
              <option value="sms">短信</option>
              <option value="email">邮件</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="w-4 h-4 accent-[var(--primary)]"
            />
            <label htmlFor="isActive" className="text-sm text-[var(--foreground-secondary)]">
              立规则创建后即启用
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] transition-colors text-sm"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity text-sm"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "保存中..." : isEditing ? "保存修改" : "创建规则"}
          </button>
        </div>
      </form>
    </GlowCard>
  )
}

function EventCard({
  event,
  onAcknowledge,
  onResolve,
  onIgnore,
  loading,
}: {
  event: AlertEvent
  onAcknowledge: () => void
  onResolve: () => void
  onIgnore: () => void
  loading: boolean
}) {
  return (
    <GlowCard variant={severityVariant[event.severity] as "primary" | "success" | "warning" | "danger"} className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-[var(--foreground)]">{event.ruleName}</h4>
            <TagCapsule label={severityLabel[event.severity] || event.severity} variant={severityVariant[event.severity] as "primary" | "success" | "warning" | "danger" | "accent" | "neutral"} size="sm" />
            <TagCapsule label={statusLabel[event.status] || event.status} variant={statusVariant[event.status] as "primary" | "success" | "warning" | "danger" | "accent" | "neutral"} size="sm" />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span className="text-[var(--foreground-secondary)]">
              指标：<span className="text-[var(--foreground)] font-mono">{metricLabel[event.metric] || event.metric}</span>
            </span>
            <span className="text-[var(--foreground-secondary)]">
              当前值：<span className="text-[var(--danger)] font-mono font-bold">{event.value}</span>
            </span>
            <span className="text-[var(--foreground-secondary)]">
              阈值：<span className="text-[var(--foreground)] font-mono">{event.threshold}</span>
            </span>
            <span className="text-[var(--foreground-secondary)]">
              <Clock className="w-3 h-3 inline mr-1" />
              {new Date(event.createdAt).toLocaleString("zh-CN")}
            </span>
          </div>
          {event.resolvedNote && (
            <p className="mt-2 text-sm text-[var(--foreground-secondary)] bg-[var(--background)]/50 p-2 rounded">
              解决备注：{event.resolvedNote}
            </p>
          )}
        </div>
        {event.status === "pending" && (
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={onAcknowledge}
              disabled={loading}
              className="px-3 py-1.5 text-sm rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors disabled:opacity-50"
            >
              确认
            </button>
            <button
              onClick={onResolve}
              disabled={loading}
              className="px-3 py-1.5 text-sm rounded-lg bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20 transition-colors disabled:opacity-50"
            >
              解决
            </button>
            <button
              onClick={onIgnore}
              disabled={loading}
              className="px-3 py-1.5 text-sm rounded-lg bg-[var(--foreground-muted)]/10 text-[var(--foreground-secondary)] hover:bg-[var(--foreground-muted)]/20 transition-colors disabled:opacity-50"
            >
              忽略
            </button>
          </div>
        )}
        {event.status === "acknowledged" && (
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={onResolve}
              disabled={loading}
              className="px-3 py-1.5 text-sm rounded-lg bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20 transition-colors disabled:opacity-50"
            >
              解决
            </button>
            <button
              onClick={onIgnore}
              disabled={loading}
              className="px-3 py-1.5 text-sm rounded-lg bg-[var(--foreground-muted)]/10 text-[var(--foreground-secondary)] hover:bg-[var(--foreground-muted)]/20 transition-colors disabled:opacity-50"
            >
              忽略
            </button>
          </div>
        )}
      </div>
    </GlowCard>
  )
}

function TicketsTab({ onError }: { onError: (msg: string) => void }) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [sendingReply, setSendingReply] = useState(false)
  const [filter, setFilter] = useState({ status: "", priority: "" })

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter.status) params.set("status", filter.status)
      if (filter.priority) params.set("priority", filter.priority)
      const res = await fetch(`/api/platform/monitoring/tickets?${params.toString()}`)
      const json: ApiResponse<PaginatedResponse<Ticket>> = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error?.message || "获取工单失败")
      setTickets(json.data?.items || [])
    } catch (err) {
      onError(err instanceof Error ? err.message : "获取工单失败")
    } finally {
      setLoading(false)
    }
  }, [filter, onError])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  const fetchTicketDetail = async (id: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/platform/monitoring/tickets/${id}`)
      const json: ApiResponse<Ticket> = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error?.message || "获取工单详情失败")
      setSelectedTicket(json.data || null)
    } catch (err) {
      onError(err instanceof Error ? err.message : "获取工单详情失败")
    } finally {
      setDetailLoading(false)
    }
  }

  const handleSelectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    fetchTicketDetail(ticket.id)
  }

  const handleSendReply = async () => {
    if (!selectedTicket || !replyContent.trim()) return
    setSendingReply(true)
    try {
      const res = await fetch(`/api/platform/monitoring/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent.trim() }),
      })
      const json: ApiResponse<TicketMessage> = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error?.message || "发送失败")
      setReplyContent("")
      await fetchTicketDetail(selectedTicket.id)
      await fetchTickets()
    } catch (err) {
      onError(err instanceof Error ? err.message : "发送失败")
    } finally {
      setSendingReply(false)
    }
  }

  const handleUpdateStatus = async (status: string) => {
    if (!selectedTicket) return
    try {
      const res = await fetch(`/api/platform/monitoring/tickets/${selectedTicket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const json: ApiResponse<Ticket> = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error?.message || "更新失败")
      await fetchTicketDetail(selectedTicket.id)
      await fetchTickets()
    } catch (err) {
      onError(err instanceof Error ? err.message : "更新失败")
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-[600px]">
      <div className="lg:col-span-2 space-y-3">
        <div className="flex flex-wrap gap-2">
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className={`${inputClass} w-auto text-sm flex-1 min-w-[100px]`}
          >
            <option value="">全部状态</option>
            <option value="pending">待处理</option>
            <option value="processing">处理中</option>
            <option value="resolved">已解决</option>
            <option value="closed">已关闭</option>
          </select>
          <select
            value={filter.priority}
            onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
            className={`${inputClass} w-auto text-sm flex-1 min-w-[100px]`}
          >
            <option value="">全部优先级</option>
            <option value="urgent">紧急</option>
            <option value="high">高</option>
            <option value="normal">普通</option>
            <option value="low">低</option>
          </select>
        </div>

        <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
          {loading ? (
            <div className="py-16 text-center text-[var(--foreground-secondary)]">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
              加载中...
            </div>
          ) : tickets.length === 0 ? (
            <GlowCard variant="primary" className="p-8 text-center">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 text-[var(--foreground-secondary)]/50" />
              <p className="text-sm text-[var(--foreground-secondary)]">暂无工单</p>
            </GlowCard>
          ) : (
            tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => handleSelectTicket(ticket)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedTicket?.id === ticket.id
                    ? "border-[var(--primary)]/50 bg-[var(--primary)]/5 shadow-[var(--glow-primary-sm)]"
                    : "border-[var(--border)] bg-[var(--background-card)] hover:border-[var(--primary)]/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-medium text-[var(--foreground)] text-sm line-clamp-1 flex-1">
                    {ticket.subject}
                  </h4>
                  <TagCapsule label={priorityLabel[ticket.priority] || ticket.priority} variant={priorityVariant[ticket.priority] as "primary" | "success" | "warning" | "danger" | "accent" | "neutral"} size="sm" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <TagCapsule label={statusLabel[ticket.status] || ticket.status} variant={statusVariant[ticket.status] as "primary" | "success" | "warning" | "danger" | "accent" | "neutral"} size="sm" />
                  <span className="text-xs text-[var(--foreground-muted)]">
                    {ticket.organization?.name || "-"}
                  </span>
                </div>
                <p className="text-xs text-[var(--foreground-muted)] mt-2">
                  {new Date(ticket.createdAt).toLocaleString("zh-CN")}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="lg:col-span-3">
        {!selectedTicket ? (
          <GlowCard variant="primary" className="h-full flex items-center justify-center p-12">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-[var(--foreground-secondary)]/50" />
              <p className="text-[var(--foreground-secondary)]">选择左侧工单查看详情</p>
            </div>
          </GlowCard>
        ) : detailLoading ? (
          <GlowCard variant="primary" className="h-full flex items-center justify-center p-12">
            <div className="text-center">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-[var(--primary)]" />
              <p className="text-[var(--foreground-secondary)]">加载详情...</p>
            </div>
          </GlowCard>
        ) : (
          <GlowCard variant="primary" className="h-full flex flex-col overflow-hidden">
            <div className="p-5 border-b border-[var(--border)]">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h2 className="text-lg font-bold text-[var(--foreground)]">{selectedTicket.subject}</h2>
                <div className="flex gap-2 flex-shrink-0">
                  <TagCapsule label={priorityLabel[selectedTicket.priority] || selectedTicket.priority} variant={priorityVariant[selectedTicket.priority] as "primary" | "success" | "warning" | "danger" | "accent" | "neutral"} size="sm" />
                  <TagCapsule label={statusLabel[selectedTicket.status] || selectedTicket.status} variant={statusVariant[selectedTicket.status] as "primary" | "success" | "warning" | "danger" | "accent" | "neutral"} size="sm" />
                </div>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span className="text-[var(--foreground-secondary)]">
                  <Tag className="w-3 h-3 inline mr-1" />
                  {categoryLabel[selectedTicket.category] || selectedTicket.category}
                </span>
                <span className="text-[var(--foreground-secondary)]">
                  <User className="w-3 h-3 inline mr-1" />
                  {selectedTicket.user?.name || selectedTicket.user?.email || "未知用户"}
                </span>
                <span className="text-[var(--foreground-secondary)]">
                  <ShieldAlert className="w-3 h-3 inline mr-1" />
                  {selectedTicket.organization?.name || "-"}
                </span>
                <span className="text-[var(--foreground-secondary)]">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {new Date(selectedTicket.createdAt).toLocaleString("zh-CN")}
                </span>
              </div>

              {(selectedTicket.status === "pending" || selectedTicket.status === "processing") && (
                <div className="flex gap-2 mt-4">
                  {selectedTicket.status === "pending" && (
                    <button
                      onClick={() => handleUpdateStatus("processing")}
                      className="px-3 py-1.5 text-sm rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors"
                    >
                      开始处理
                    </button>
                  )}
                  <button
                    onClick={() => handleUpdateStatus("resolved")}
                    className="px-3 py-1.5 text-sm rounded-lg bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20 transition-colors"
                  >
                    标记已解决
                  </button>
                  <button
                    onClick={() => handleUpdateStatus("closed")}
                    className="px-3 py-1.5 text-sm rounded-lg bg-[var(--foreground-muted)]/10 text-[var(--foreground-secondary)] hover:bg-[var(--foreground-muted)]/20 transition-colors"
                  >
                    关闭工单
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="bg-[var(--background)]/50 rounded-lg p-4">
                <p className="text-xs text-[var(--foreground-secondary)] mb-2">问题描述</p>
                <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>

              {selectedTicket.messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.senderRole === "super_admin" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: msg.senderRole === "super_admin"
                        ? "color-mix(in srgb, var(--primary) 20%, transparent)"
                        : "color-mix(in srgb, var(--accent) 20%, transparent)",
                      color: msg.senderRole === "super_admin" ? "var(--primary)" : "var(--accent)",
                    }}
                  >
                    <User className="w-4 h-4" />
                  </div>
                  <div className={`max-w-[80%] ${msg.senderRole === "super_admin" ? "text-right" : ""}`}>
                    <p className="text-xs text-[var(--foreground-secondary)] mb-1">
                      {msg.senderRole === "super_admin" ? "管理员" : (msg.sender?.name || msg.sender?.email || "用户")}
                      <span className="ml-2 text-[var(--foreground-muted)]">
                        {new Date(msg.createdAt).toLocaleString("zh-CN")}
                      </span>
                    </p>
                    <div
                      className={`inline-block px-4 py-2.5 rounded-2xl text-sm ${
                        msg.senderRole === "super_admin"
                          ? "bg-[var(--primary)]/15 text-[var(--foreground)] rounded-tr-sm"
                          : "bg-[var(--background)]/70 text-[var(--foreground)] rounded-tl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedTicket.status !== "closed" && (
              <div className="p-4 border-t border-[var(--border)]">
                <div className="flex gap-2">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="输入回复内容..."
                    rows={2}
                    className={`${inputClass} resize-none flex-1`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault()
                        handleSendReply()
                      }
                    }}
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={sendingReply || !replyContent.trim()}
                    className="self-end px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
                  >
                    {sendingReply ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    发送
                  </button>
                </div>
                <p className="text-xs text-[var(--foreground-muted)] mt-2">Ctrl + Enter 快速发送</p>
              </div>
            )}
          </GlowCard>
        )}
      </div>
    </div>
  )
}
