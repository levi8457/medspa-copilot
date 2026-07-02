"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { GlowCard } from "@/components/futuristic/GlowCard"
import {
  ArrowLeft,
  Building2,
  RefreshCw,
  AlertCircle,
  Pause,
  Play,
  CalendarClock,
  RefreshCcw,
  CreditCard,
  Users,
  Receipt,
  Phone,
  Mail,
  Shield,
} from "lucide-react"

interface Plan {
  id: string
  name: string
  maxSeats: number
  maxRecordingHours: number
  maxAiCalls: number
  priceMonthly: number
  trialDays: number
}

interface Subscription {
  id: string
  status: string
  seatsUsed: number
  seatsLimit: number
  startsAt: string
  endsAt: string | null
  trialEndsAt: string | null
  plan: Plan
}

interface Order {
  id: string
  type: string
  amount: number
  period: string
  status: string
  createdAt: string
  paidAt: string | null
  plan: { name: string }
}

interface UserItem {
  id: string
  name: string | null
  email: string
  phone: string | null
  role: string
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

interface OrganizationDetail {
  id: string
  name: string
  slug: string | null
  logo: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  subscription: Subscription | null
  orders: Order[]
  users: UserItem[]
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string }
}

const subscriptionStatusMap: Record<string, { label: string; color: string }> = {
  trial: { label: "试用中", color: "var(--accent)" },
  active: { label: "有效", color: "var(--success)" },
  suspended: { label: "已暂停", color: "var(--warning)" },
  expired: { label: "已过期", color: "var(--danger)" },
  cancelled: { label: "已取消", color: "var(--foreground-secondary)" },
}

const orderStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "待支付", color: "var(--warning)" },
  paid: { label: "已支付", color: "var(--success)" },
  cancelled: { label: "已取消", color: "var(--foreground-secondary)" },
  refunded: { label: "已退款", color: "var(--danger)" },
}

const orderTypeMap: Record<string, string> = {
  new: "新购",
  renew: "续费",
  upgrade: "升级",
}

const roleMap: Record<string, string> = {
  super_admin: "超级管理员",
  org_admin: "机构管理员",
  consultant: "咨询师",
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("zh-CN")
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleString("zh-CN")
}

export default function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [org, setOrg] = useState<OrganizationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDetail = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/platform/organizations/${id}`)
      const json: ApiResponse<OrganizationDetail> = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "获取机构详情失败")
      }
      setOrg(json.data || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取机构详情失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleAction = (action: string) => {
    alert(`操作「${action}」功能开发中，敬请期待。`)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-[var(--foreground-secondary)]">
            <RefreshCw className="w-5 h-5 animate-spin" />
            加载中...
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Link
            href="/organizations"
            className="flex items-center gap-2 text-[var(--foreground-secondary)] hover:text-[var(--primary)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回机构列表
          </Link>
          <GlowCard variant="danger" className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-[var(--danger)]" />
            <p className="text-[var(--danger)] mb-4">{error}</p>
            <button
              onClick={fetchDetail}
              className="px-4 py-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors"
            >
              重新加载
            </button>
          </GlowCard>
        </div>
      </div>
    )
  }

  if (!org) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <GlowCard className="p-8 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-[var(--foreground-secondary)]" />
            <p className="text-[var(--foreground-secondary)]">未找到该机构</p>
          </GlowCard>
        </div>
      </div>
    )
  }

  const sub = org.subscription
  const subInfo = sub
    ? subscriptionStatusMap[sub.status] || { label: sub.status, color: "var(--foreground-secondary)" }
    : null

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/organizations"
              className="flex items-center gap-2 text-[var(--foreground-secondary)] hover:text-[var(--primary)] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              返回
            </Link>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">{org.name}</h1>
          </div>
          <button
            onClick={fetchDetail}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <GlowCard variant="primary" className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                  <Building2 className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--foreground)]">{org.name}</h2>
                  <span
                    className="inline-block px-2 py-0.5 rounded text-xs mt-1"
                    style={{
                      backgroundColor: org.isActive
                        ? "color-mix(in srgb, var(--success) 20%, transparent)"
                        : "color-mix(in srgb, var(--danger) 20%, transparent)",
                      color: org.isActive ? "var(--success)" : "var(--danger)",
                    }}
                  >
                    {org.isActive ? "活跃" : "已停用"}
                  </span>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--foreground-secondary)]">机构 ID</span>
                  <span className="font-mono text-[var(--foreground)] text-xs">{org.id}</span>
                </div>
                {org.slug && (
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--foreground-secondary)]">标识</span>
                    <span className="font-mono text-[var(--foreground)]">{org.slug}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[var(--foreground-secondary)]">创建时间</span>
                  <span className="text-[var(--foreground)]">{formatDate(org.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--foreground-secondary)]">更新时间</span>
                  <span className="text-[var(--foreground)]">{formatDate(org.updatedAt)}</span>
                </div>
              </div>
            </GlowCard>

            <GlowCard variant="accent" className="p-6">
              <h3 className="text-sm font-medium text-[var(--foreground-secondary)] mb-4 uppercase tracking-wider">
                操作
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleAction(org.isActive ? "暂停服务" : "恢复服务")}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)] transition-colors"
                >
                  {org.isActive ? (
                    <>
                      <Pause className="w-4 h-4 text-[var(--warning)]" />
                      <span>暂停服务</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 text-[var(--success)]" />
                      <span>恢复服务</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleAction("续期")}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)] transition-colors"
                >
                  <CalendarClock className="w-4 h-4 text-[var(--primary)]" />
                  <span>续期</span>
                </button>
                <button
                  onClick={() => handleAction("调整套餐")}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)] transition-colors"
                >
                  <RefreshCcw className="w-4 h-4 text-[var(--accent)]" />
                  <span>调整套餐</span>
                </button>
              </div>
            </GlowCard>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <GlowCard variant="primary" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-[var(--foreground)] flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[var(--primary)]" />
                  订阅信息
                </h3>
                {subInfo && (
                  <span
                    className="px-2 py-0.5 rounded text-xs"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${subInfo.color} 20%, transparent)`,
                      color: subInfo.color,
                    }}
                  >
                    {subInfo.label}
                  </span>
                )}
              </div>
              {sub ? (
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label="套餐名称" value={sub.plan.name} />
                  <InfoItem label="席位使用" value={`${sub.seatsUsed} / ${sub.seatsLimit}`} mono />
                  <InfoItem label="开始时间" value={formatDate(sub.startsAt)} />
                  <InfoItem label="到期时间" value={formatDate(sub.endsAt)} />
                  <InfoItem label="试用到期" value={formatDate(sub.trialEndsAt)} />
                  <InfoItem
                    label="月费"
                    value={`¥${sub.plan.priceMonthly.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`}
                    mono
                  />
                  <InfoItem label="录音配额" value={`${sub.plan.maxRecordingHours} 小时/月`} />
                  <InfoItem label="AI 调用配额" value={`${sub.plan.maxAiCalls} 次/月`} />
                </div>
              ) : (
                <p className="text-sm text-[var(--foreground-secondary)] py-4 text-center">
                  该机构暂无订阅信息
                </p>
              )}
            </GlowCard>

            <GlowCard variant="accent" className="p-6">
              <h3 className="text-lg font-medium text-[var(--foreground)] flex items-center gap-2 mb-4">
                <Receipt className="w-5 h-5 text-[var(--accent)]" />
                最近订单
              </h3>
              {org.orders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="text-left py-2 px-3 text-xs font-medium text-[var(--foreground-secondary)]">类型</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-[var(--foreground-secondary)]">套餐</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-[var(--foreground-secondary)]">金额</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-[var(--foreground-secondary)]">周期</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-[var(--foreground-secondary)]">状态</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-[var(--foreground-secondary)]">创建时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {org.orders.slice(0, 10).map((order) => {
                        const statusInfo = orderStatusMap[order.status] || {
                          label: order.status,
                          color: "var(--foreground-secondary)",
                        }
                        return (
                          <tr key={order.id} className="border-b border-[var(--border)] last:border-0">
                            <td className="py-2 px-3 text-sm text-[var(--foreground)]">
                              {orderTypeMap[order.type] || order.type}
                            </td>
                            <td className="py-2 px-3 text-sm text-[var(--foreground)]">{order.plan.name}</td>
                            <td className="py-2 px-3 text-sm font-mono tabular-nums text-[var(--foreground)]">
                              ¥{order.amount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-3 text-sm text-[var(--foreground-secondary)]">
                              {order.period === "monthly" ? "月付" : order.period === "yearly" ? "年付" : order.period}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className="px-2 py-0.5 rounded text-xs"
                                style={{
                                  backgroundColor: `color-mix(in srgb, ${statusInfo.color} 20%, transparent)`,
                                  color: statusInfo.color,
                                }}
                              >
                                {statusInfo.label}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-sm text-[var(--foreground-secondary)]">
                              {formatDate(order.createdAt)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-[var(--foreground-secondary)] py-4 text-center">
                  暂无订单记录
                </p>
              )}
            </GlowCard>

            <GlowCard variant="success" className="p-6">
              <h3 className="text-lg font-medium text-[var(--foreground)] flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-[var(--success)]" />
                用户列表
                <span className="text-sm font-normal text-[var(--foreground-secondary)]">
                  （共 {org.users.length} 人）
                </span>
              </h3>
              {org.users.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="text-left py-2 px-3 text-xs font-medium text-[var(--foreground-secondary)]">姓名</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-[var(--foreground-secondary)]">联系方式</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-[var(--foreground-secondary)]">角色</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-[var(--foreground-secondary)]">状态</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-[var(--foreground-secondary)]">最后登录</th>
                      </tr>
                    </thead>
                    <tbody>
                      {org.users.map((user) => (
                        <tr key={user.id} className="border-b border-[var(--border)] last:border-0">
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[var(--foreground)]">
                                {user.name || "—"}
                              </span>
                              {user.role === "org_admin" && (
                                <Shield className="w-3 h-3 text-[var(--primary)]" />
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-sm text-[var(--foreground-secondary)]">
                            <div className="flex flex-col gap-0.5">
                              {user.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {user.phone}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {user.email}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-sm text-[var(--foreground)]">
                            {roleMap[user.role] || user.role}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className="px-2 py-0.5 rounded text-xs"
                              style={{
                                backgroundColor: user.isActive
                                  ? "color-mix(in srgb, var(--success) 20%, transparent)"
                                  : "color-mix(in srgb, var(--foreground-secondary) 20%, transparent)",
                                color: user.isActive ? "var(--success)" : "var(--foreground-secondary)",
                              }}
                            >
                              {user.isActive ? "启用" : "禁用"}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-sm text-[var(--foreground-secondary)]">
                            {formatDateTime(user.lastLoginAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-[var(--foreground-secondary)] py-4 text-center">
                  暂无用户
                </p>
              )}
            </GlowCard>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoItem({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <p className="text-xs text-[var(--foreground-secondary)] mb-1">{label}</p>
      <p className={`text-sm text-[var(--foreground)] ${mono ? "font-mono tabular-nums" : ""}`}>
        {value}
      </p>
    </div>
  )
}
