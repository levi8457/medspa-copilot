"use client"

import { apiFetch } from "@/lib/api-fetch"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { GlowCard } from "@/components/futuristic/GlowCard"
import {
  Settings,
  Brain,
  ShieldAlert,
  Building2,
  CreditCard,
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  Zap,
} from "lucide-react"

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

interface SystemStatusData {
  services: ServiceStatus[]
  errorRate24h: number
  callCount24h: number
  activeOrgs: number
  alertStats: {
    pending: number
    acknowledged: number
    resolved: number
    critical: number
    warning: number
    info: number
  }
}

const statusConfig = {
  healthy: {
    icon: CheckCircle,
    color: "var(--success)",
    label: "正常",
  },
  warning: {
    icon: AlertTriangle,
    color: "var(--warning)",
    label: "警告",
  },
  critical: {
    icon: XCircle,
    color: "var(--danger)",
    label: "异常",
  },
}

const quickLinks = [
  {
    title: "AI 模型配置",
    description: "配置 DeepSeek 模型、API Key 等参数",
    href: "/platform/ai-config",
    icon: Brain,
    color: "var(--primary)",
  },
  {
    title: "合规词库管理",
    description: "管理医疗合规违禁词和替换规则",
    href: "/platform/ai-config",
    icon: ShieldAlert,
    color: "var(--warning)",
  },
  {
    title: "机构管理",
    description: "管理入驻机构、账号权限",
    href: "/platform/organizations",
    icon: Building2,
    color: "var(--accent)",
  },
  {
    title: "套餐与订单",
    description: "管理订阅套餐和订单",
    href: "/platform/billing/plans",
    icon: CreditCard,
    color: "var(--success)",
  },
  {
    title: "监控告警",
    description: "查看系统状态和告警规则",
    href: "/platform/monitoring",
    icon: Activity,
    color: "var(--primary)",
  },
  {
    title: "Prompt 版本",
    description: "管理 AI 提示词版本",
    href: "/platform/ai-config",
    icon: Zap,
    color: "var(--accent)",
  },
]

export default function PlatformSettingsPage() {
  const [systemStatus, setSystemStatus] = useState<SystemStatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch("/api/platform/monitoring/status")
      const json: ApiResponse<SystemStatusData> = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "获取系统状态失败")
      }
      setSystemStatus(json.data || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取系统状态失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">系统设置</h1>
            <p className="text-[var(--foreground-secondary)] mt-1">
              平台级系统配置与状态监控
            </p>
          </div>
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            刷新状态
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="活跃机构"
            value={systemStatus?.activeOrgs || 0}
            icon={Building2}
            color="var(--primary)"
            loading={loading}
          />
          <StatCard
            label="24h AI 调用"
            value={systemStatus?.callCount24h?.toLocaleString() || "0"}
            icon={Zap}
            color="var(--accent)"
            loading={loading}
          />
          <StatCard
            label="24h 错误率"
            value={`${systemStatus?.errorRate24h || 0}%`}
            icon={Activity}
            color={
              (systemStatus?.errorRate24h || 0) > 1
                ? "var(--danger)"
                : (systemStatus?.errorRate24h || 0) > 0.5
                ? "var(--warning)"
                : "var(--success)"
            }
            loading={loading}
          />
        </div>

        <GlowCard variant="primary" className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <Activity className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold text-[var(--foreground)]">服务状态</h2>
          </div>

          {loading ? (
            <div className="py-8 text-center text-[var(--foreground-secondary)]">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
              加载中...
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-sm">
              {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {systemStatus?.services.map((service, index) => {
                const config = statusConfig[service.status]
                const StatusIcon = config.icon
                return (
                  <motion.div
                    key={service.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-lg bg-[var(--background)]/50 border border-[var(--border)]"
                  >
                    <div className="flex items-center gap-3">
                      <StatusIcon
                        className="w-5 h-5"
                        style={{ color: config.color }}
                      />
                      <div>
                        <p className="font-medium text-[var(--foreground)]">
                          {service.name}
                        </p>
                        <p className="text-xs text-[var(--foreground-secondary)]">
                          延迟 {service.latency}ms
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className="text-sm font-medium"
                        style={{ color: config.color }}
                      >
                        {config.label}
                      </span>
                      <p className="text-xs text-[var(--foreground-secondary)]">
                        可用率 {service.uptime}%
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </GlowCard>

        <GlowCard variant="accent" className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <ShieldAlert className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-lg font-semibold text-[var(--foreground)]">告警概览</h2>
          </div>

          {loading ? (
            <div className="py-8 text-center text-[var(--foreground-secondary)]">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
              加载中...
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <AlertStat
                label="待处理"
                value={systemStatus?.alertStats.pending || 0}
                color="var(--warning)"
              />
              <AlertStat
                label="处理中"
                value={systemStatus?.alertStats.acknowledged || 0}
                color="var(--primary)"
              />
              <AlertStat
                label="已解决"
                value={systemStatus?.alertStats.resolved || 0}
                color="var(--success)"
              />
              <AlertStat
                label="严重告警"
                value={systemStatus?.alertStats.critical || 0}
                color="var(--danger)"
              />
              <AlertStat
                label="警告"
                value={systemStatus?.alertStats.warning || 0}
                color="var(--warning)"
              />
              <AlertStat
                label="信息"
                value={systemStatus?.alertStats.info || 0}
                color="var(--primary)"
              />
            </div>
          )}
        </GlowCard>

        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            快捷配置入口
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((link, index) => {
              const Icon = link.icon
              return (
                <motion.a
                  key={link.title}
                  href={link.href}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="block"
                >
                  <GlowCard
                    variant="primary"
                    className="p-5 h-full cursor-pointer hover:border-[var(--primary)]/50 transition-all group"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                      style={{ backgroundColor: `color-mix(in srgb, ${link.color} 15%, transparent)` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: link.color }} />
                    </div>
                    <h3 className="font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                      {link.title}
                    </h3>
                    <p className="text-sm text-[var(--foreground-secondary)] mt-1">
                      {link.description}
                    </p>
                  </GlowCard>
                </motion.a>
              )
            })}
          </div>
        </div>

        <GlowCard variant="warning" className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-[var(--warning)]" />
            <h2 className="text-lg font-semibold text-[var(--foreground)]">系统信息</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <InfoRow label="系统版本" value="v2.0.0" />
            <InfoRow label="部署环境" value="生产环境" />
            <InfoRow label="数据库" value="PostgreSQL" />
            <InfoRow label="AI 提供商" value="DeepSeek" />
            <InfoRow label="ASR 提供商" value="阿里云 / 腾讯云" />
            <InfoRow label="存储服务" value="S3 兼容 OSS" />
          </div>
        </GlowCard>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  loading,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  color: string
  loading?: boolean
}) {
  return (
    <GlowCard variant="primary" className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--foreground-secondary)]">{label}</p>
          <p
            className="text-2xl font-bold mt-2 font-mono"
            style={{ color }}
          >
            {loading ? (
              <span className="inline-block w-16 h-8 bg-[var(--border)]/50 rounded animate-pulse" />
            ) : (
              value
            )}
          </p>
        </div>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
    </GlowCard>
  )
}

function AlertStat({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="p-4 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-center">
      <p className="text-2xl font-bold font-mono" style={{ color }}>
        {value}
      </p>
      <p className="text-sm text-[var(--foreground-secondary)] mt-1">{label}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--border)]/50 last:border-0">
      <span className="text-[var(--foreground-secondary)]">{label}</span>
      <span className="text-[var(--foreground)] font-medium">{value}</span>
    </div>
  )
}
