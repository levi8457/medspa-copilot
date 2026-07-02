"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { GlowCard } from "@/components/futuristic/GlowCard"
import {
  AlertCircle,
  CheckCircle2,
  Plus,
  Receipt,
  RefreshCw,
  X,
} from "lucide-react"

interface Order {
  id: string
  orgId: string
  planId: string
  type: string
  amount: number
  period: string
  status: string
  paidAt: string | null
  paymentMethod: string | null
  paymentNo: string | null
  invoiceNo: string | null
  note: string | null
  createdAt: string
  organization: { id: string; name: string } | null
  plan: { id: string; name: string } | null
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface OrdersResponse {
  orders: Order[]
  pagination: Pagination
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

interface PlanOption {
  id: string
  name: string
  priceMonthly: number
  priceYearly: number
}

const statusFilters = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待支付" },
  { value: "paid", label: "已支付" },
  { value: "cancelled", label: "已取消" },
  { value: "refunded", label: "已退款" },
] as const

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

const periodMap: Record<string, string> = {
  monthly: "月付",
  yearly: "年付",
}

const paymentMethodMap: Record<string, string> = {
  wechat: "微信支付",
  alipay: "支付宝",
  offline: "线下支付",
}

const inputClass =
  "w-full px-4 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"

const labelClass = "block text-sm font-medium text-[var(--foreground-secondary)] mb-2"

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [actioningId, setActioningId] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = new URL("/api/platform/orders", window.location.origin)
      if (statusFilter !== "all") {
        url.searchParams.set("status", statusFilter)
      }
      url.searchParams.set("page", String(pagination.page))
      url.searchParams.set("pageSize", String(pagination.pageSize))
      const res = await fetch(url.toString())
      const json: ApiResponse<OrdersResponse> = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "获取订单列表失败")
      }
      setOrders(json.data?.orders || [])
      if (json.data?.pagination) {
        setPagination(json.data.pagination)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取订单列表失败")
    } finally {
      setLoading(false)
    }
  }, [statusFilter, pagination.page, pagination.pageSize])

  useEffect(() => {
    fetchOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, pagination.page])

  const handleMarkPaid = async (order: Order) => {
    if (!window.confirm(`确认将订单「${order.id.slice(-8)}」标记为已支付？`)) {
      return
    }
    setActioningId(order.id)
    try {
      const res = await fetch(`/api/platform/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid", paymentMethod: "offline" }),
      })
      const json: ApiResponse<Order> = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "标记支付失败")
      }
      await fetchOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : "标记支付失败")
    } finally {
      setActioningId(null)
    }
  }

  const handleFilterChange = (value: string) => {
    setStatusFilter(value)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }))
  }

  const filteredStats = useMemo(() => {
    const total = orders.length
    const paidCount = orders.filter((o) => o.status === "paid").length
    const pendingCount = orders.filter((o) => o.status === "pending").length
    const totalAmount = orders
      .filter((o) => o.status === "paid")
      .reduce((sum, o) => sum + o.amount, 0)
    return { total, paidCount, pendingCount, totalAmount }
  }, [orders])

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">订单管理</h1>
            <p className="text-[var(--foreground-secondary)] mt-1">
              管理平台所有订单与支付记录
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchOrders}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              刷新
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              手动创建订单
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox label="当前页订单数" value={String(filteredStats.total)} />
          <StatBox label="已支付" value={String(filteredStats.paidCount)} color="var(--success)" />
          <StatBox label="待支付" value={String(filteredStats.pendingCount)} color="var(--warning)" />
          <StatBox
            label="已支付金额"
            value={`¥${filteredStats.totalAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`}
            color="var(--primary)"
          />
        </div>

        <GlowCard variant="primary" className="p-6">
          <div className="flex gap-2 overflow-x-auto pb-4">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => handleFilterChange(filter.value)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  statusFilter === filter.value
                    ? "bg-[var(--primary)] text-[var(--background)]"
                    : "bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)]"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-4 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--danger)] flex-shrink-0" />
              <p className="text-sm text-[var(--danger)]">{error}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <Th>机构名称</Th>
                  <Th>套餐</Th>
                  <Th>类型</Th>
                  <Th>金额</Th>
                  <Th>周期</Th>
                  <Th>状态</Th>
                  <Th>支付方式</Th>
                  <Th>创建时间</Th>
                  <Th align="right">操作</Th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[var(--foreground-secondary)]">
                      <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                      加载中...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[var(--foreground-secondary)]">
                      <Receipt className="w-12 h-12 mx-auto mb-3 text-[var(--foreground-secondary)]/50" />
                      暂无订单数据
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const statusInfo = orderStatusMap[order.status] || {
                      label: order.status,
                      color: "var(--foreground-secondary)",
                    }
                    return (
                      <tr
                        key={order.id}
                        className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]/30 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <span className="font-medium text-[var(--foreground)]">
                            {order.organization?.name || "—"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--foreground)]">
                          {order.plan?.name || "—"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-[var(--foreground-secondary)]">
                            {orderTypeMap[order.type] || order.type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm tabular-nums text-[var(--foreground)]">
                            ¥{order.amount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--foreground-secondary)]">
                          {periodMap[order.period] || order.period}
                        </td>
                        <td className="py-3 px-4">
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
                        <td className="py-3 px-4 text-sm text-[var(--foreground-secondary)]">
                          {order.paymentMethod
                            ? paymentMethodMap[order.paymentMethod] || order.paymentMethod
                            : "—"}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--foreground-secondary)]">
                          {new Date(order.createdAt).toLocaleString("zh-CN")}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {order.status === "pending" ? (
                            <button
                              onClick={() => handleMarkPaid(order)}
                              disabled={actioningId === order.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20 transition-colors text-sm disabled:opacity-50"
                            >
                              {actioningId === order.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4" />
                              )}
                              标记已支付
                            </button>
                          ) : (
                            <span className="text-xs text-[var(--foreground-muted)]">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-[var(--border)] mt-4">
              <p className="text-sm text-[var(--foreground-secondary)]">
                共 {pagination.total} 条，第 {pagination.page} / {pagination.totalPages} 页
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1 || loading}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </GlowCard>
      </div>

      {showCreateModal && (
        <CreateOrderModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            fetchOrders()
          }}
          onError={(msg) => setError(msg)}
        />
      )}
    </div>
  )
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={`py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)] ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  )
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--background-glass)] backdrop-blur-xl p-4">
      <p className="text-xs uppercase tracking-wider text-[var(--foreground-secondary)]">{label}</p>
      <p
        className="font-mono text-xl font-bold tabular-nums mt-1"
        style={{ color: color || "var(--foreground)" }}
      >
        {value}
      </p>
    </div>
  )
}

function CreateOrderModal({
  onClose,
  onSuccess,
  onError,
}: {
  onClose: () => void
  onSuccess: () => void
  onError: (msg: string) => void
}) {
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([])
  const [plans, setPlans] = useState<PlanOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    orgId: "",
    planId: "",
    type: "new" as "new" | "renew" | "upgrade",
    period: "monthly" as "monthly" | "yearly",
    amount: 0,
    paymentMethod: "offline",
    note: "",
  })

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [orgRes, planRes] = await Promise.all([
          fetch("/api/platform/organizations"),
          fetch("/api/platform/plans"),
        ])
        const orgJson: ApiResponse<OrganizationOption[]> = await orgRes.json()
        const planJson: ApiResponse<PlanOption[]> = await planRes.json()
        if (orgJson.success && orgJson.data) {
          setOrganizations(orgJson.data)
        }
        if (planJson.success && planJson.data) {
          setPlans(planJson.data)
          if (planJson.data.length > 0) {
            setForm((prev) => ({
              ...prev,
              planId: planJson.data![0].id,
              amount: planJson.data![0].priceMonthly,
            }))
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchOptions()
  }, [])

  const handlePlanChange = (planId: string) => {
    const plan = plans.find((p) => p.id === planId)
    setForm((prev) => ({
      ...prev,
      planId,
      amount:
        prev.period === "monthly"
          ? plan?.priceMonthly ?? 0
          : plan?.priceYearly ?? 0,
    }))
  }

  const handlePeriodChange = (period: "monthly" | "yearly") => {
    const plan = plans.find((p) => p.id === form.planId)
    setForm((prev) => ({
      ...prev,
      period,
      amount:
        period === "monthly"
          ? plan?.priceMonthly ?? 0
          : plan?.priceYearly ?? 0,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.orgId) {
      onError("请选择机构")
      return
    }
    if (!form.planId) {
      onError("请选择套餐")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/platform/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: form.orgId,
          planId: form.planId,
          type: form.type,
          period: form.period,
          amount: form.amount,
          paymentMethod: form.paymentMethod,
          note: form.note.trim() || undefined,
        }),
      })
      const json: ApiResponse<Order> = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "创建订单失败")
      }
      onSuccess()
    } catch (err) {
      onError(err instanceof Error ? err.message : "创建订单失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)] backdrop-blur-sm"
      onClick={onClose}
    >
      <GlowCard
        variant="primary"
        intensity="high"
        className="p-6 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[var(--foreground)]">手动创建订单</h2>
          <button
            onClick={onClose}
            className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-[var(--foreground-secondary)]">
            <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin" />
            加载选项数据...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>机构 *</label>
              <select
                value={form.orgId}
                onChange={(e) => setForm({ ...form, orgId: e.target.value })}
                className={inputClass}
              >
                <option value="">请选择机构</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
              {organizations.length === 0 && (
                <p className="text-xs text-[var(--warning)] mt-1">暂无机构数据</p>
              )}
            </div>

            <div>
              <label className={labelClass}>套餐 *</label>
              <select
                value={form.planId}
                onChange={(e) => handlePlanChange(e.target.value)}
                className={inputClass}
              >
                <option value="">请选择套餐</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}（月¥{plan.priceMonthly} / 年¥{plan.priceYearly}）
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>订单类型 *</label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as "new" | "renew" | "upgrade" })
                  }
                  className={inputClass}
                >
                  <option value="new">新购</option>
                  <option value="renew">续费</option>
                  <option value="upgrade">升级</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>计费周期 *</label>
                <select
                  value={form.period}
                  onChange={(e) => handlePeriodChange(e.target.value as "monthly" | "yearly")}
                  className={inputClass}
                >
                  <option value="monthly">月付</option>
                  <option value="yearly">年付</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>金额（¥）</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label className={labelClass}>支付方式</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                  className={inputClass}
                >
                  <option value="offline">线下支付</option>
                  <option value="wechat">微信支付</option>
                  <option value="alipay">支付宝</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>备注</label>
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="可选：订单备注信息"
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {saving ? "创建中..." : "创建订单"}
              </button>
            </div>
          </form>
        )}
      </GlowCard>
    </div>
  )
}
