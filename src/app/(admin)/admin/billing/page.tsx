"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertCircle,
  Check,
  Clock,
  Crown,
  HardDrive,
  Mic,
  RefreshCw,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { apiFetch } from "@/lib/api-fetch"

interface Plan {
  id: string
  name: string
  description: string | null
  maxSeats: number
  maxRecordingHours: number
  maxAiCalls: number
  maxStorage: number
  priceMonthly: number
  priceYearly: number
  trialDays: number
  isActive: boolean
  sortOrder: number
}

interface Order {
  id: string
  planId: string
  planName: string
  type: string
  amount: number
  period: string
  status: string
  paymentMethod: string | null
  paymentNo: string | null
  paidAt: string | null
  createdAt: string
}

interface Subscription {
  id: string
  planId: string
  planName: string
  status: string
  seatsUsed: number
  seatsLimit: number
  startsAt: string
  endsAt: string | null
  trialEndsAt: string | null
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string }
}

type Period = "monthly" | "yearly"
type PaymentMethod = "wechat" | "alipay" | "offline"

const SUBSCRIPTION_STATUS_LABELS: Record<string, { text: string; color: string }> = {
  trial: { text: "试用中", color: "var(--warning)" },
  active: { text: "已激活", color: "var(--success)" },
  suspended: { text: "已暂停", color: "var(--warning)" },
  expired: { text: "已过期", color: "var(--danger)" },
  cancelled: { text: "已取消", color: "var(--foreground-secondary)" },
}

const ORDER_STATUS_LABELS: Record<string, { text: string; color: string }> = {
  pending: { text: "待支付", color: "var(--warning)" },
  paid: { text: "已支付", color: "var(--success)" },
  cancelled: { text: "已取消", color: "var(--foreground-secondary)" },
  refunded: { text: "已退款", color: "var(--danger)" },
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  new: "新订",
  renew: "续费",
  upgrade: "升级",
}

function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export default function BillingPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>("monthly")
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("wechat")
  const [creating, setCreating] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [plansRes, ordersRes] = await Promise.all([
        apiFetch("/api/plans"),
        apiFetch("/api/orders"),
      ])
      const plansJson: ApiResponse<Plan[]> = await plansRes.json()
      const ordersJson: ApiResponse<{
        orders: Order[]
        currentSubscription: Subscription | null
      }> = await ordersRes.json()

      if (!plansRes.ok || !plansJson.success) {
        throw new Error(plansJson.error?.message || "获取套餐列表失败")
      }
      if (!ordersRes.ok || !ordersJson.success) {
        throw new Error(ordersJson.error?.message || "获取订单列表失败")
      }

      setPlans(plansJson.data || [])
      setOrders(ordersJson.data?.orders || [])
      setSubscription(ordersJson.data?.currentSubscription || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载数据失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleSubscribe = (plan: Plan) => {
    setSelectedPlan(plan)
    setPaymentMethod("wechat")
  }

  const handleConfirmCreate = async () => {
    if (!selectedPlan) return
    setCreating(true)
    setError(null)
    try {
      const orderType = !subscription ? "new" : selectedPlan.sortOrder > getCurrentPlanSortOrder() ? "upgrade" : "renew"
      const res = await apiFetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          type: orderType,
          period,
          paymentMethod,
        }),
      })
      const json: ApiResponse<{ id: string }> = await res.json()
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message || "创建订单失败")
      }
      setSelectedPlan(null)
      router.push(`/admin/billing/payment/${json.data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建订单失败")
    } finally {
      setCreating(false)
    }
  }

  function getCurrentPlanSortOrder(): number {
    if (!subscription) return -1
    const currentPlan = plans.find((p) => p.id === subscription.planId)
    return currentPlan?.sortOrder ?? -1
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-8 w-48 bg-[var(--card)] animate-pulse rounded" />
          <div className="h-40 bg-[var(--card)] animate-pulse rounded-xl" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 bg-[var(--card)] animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const subStatus = subscription ? SUBSCRIPTION_STATUS_LABELS[subscription.status] || { text: subscription.status, color: "var(--foreground-secondary)" } : null
  const seatsUsagePercent = subscription && subscription.seatsLimit > 0
    ? Math.min((subscription.seatsUsed / subscription.seatsLimit) * 100, 100)
    : 0

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">订阅管理</h1>
            <p className="text-[var(--foreground-secondary)] mt-1">
              管理机构订阅套餐、查看订单记录
            </p>
          </div>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            刷新
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[var(--danger)] flex-shrink-0" />
            <p className="text-sm text-[var(--danger)]">{error}</p>
          </div>
        )}

        {/* 当前订阅状态 */}
        <GlowCard variant="primary" className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[var(--primary)]/15 flex items-center justify-center">
                <Crown className="w-7 h-7 text-[var(--primary)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--foreground-secondary)]">当前订阅</p>
                <div className="flex items-center gap-3 mt-1">
                  <h2 className="text-2xl font-bold text-[var(--foreground)]">
                    {subscription?.planName || "未订阅"}
                  </h2>
                  {subStatus && (
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${subStatus.color} 18%, transparent)`,
                        color: subStatus.color,
                      }}
                    >
                      {subStatus.text}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 flex-1 min-w-[280px]">
              <div>
                <p className="text-xs text-[var(--foreground-secondary)]">到期时间</p>
                <p className="font-mono text-base text-[var(--foreground)] mt-1">
                  {subscription?.endsAt ? formatDate(subscription.endsAt) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--foreground-secondary)]">席位使用</p>
                <p className="font-mono text-base text-[var(--foreground)] mt-1">
                  {subscription ? `${subscription.seatsUsed} / ${subscription.seatsLimit}` : "—"}
                </p>
              </div>
              <div className="col-span-2 md:col-span-1">
                <p className="text-xs text-[var(--foreground-secondary)]">试用到期</p>
                <p className="font-mono text-base text-[var(--foreground)] mt-1">
                  {subscription?.trialEndsAt ? formatDate(subscription.trialEndsAt) : "—"}
                </p>
              </div>
            </div>
          </div>
          {subscription && subscription.seatsLimit > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--foreground-secondary)]">席位使用率</span>
                <span className="font-mono text-xs text-[var(--foreground)]">
                  {seatsUsagePercent.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 bg-[var(--card)] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${seatsUsagePercent}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{
                    background:
                      seatsUsagePercent >= 90
                        ? "var(--danger)"
                        : seatsUsagePercent >= 70
                          ? "var(--warning)"
                          : "var(--primary)",
                  }}
                />
              </div>
            </div>
          )}
        </GlowCard>

        {/* 套餐选择 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--primary)]" />
              选择套餐
            </h2>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--card)] border border-[var(--border)]">
              <button
                onClick={() => setPeriod("monthly")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  period === "monthly"
                    ? "bg-[var(--primary)] text-[var(--background)]"
                    : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
                }`}
              >
                按月
              </button>
              <button
                onClick={() => setPeriod("yearly")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  period === "yearly"
                    ? "bg-[var(--accent)] text-[var(--foreground)]"
                    : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
                }`}
              >
                按年 <span className="text-xs opacity-80">更划算</span>
              </button>
            </div>
          </div>

          {plans.length === 0 ? (
            <GlowCard variant="warning" className="p-12 text-center">
              <Sparkles className="w-12 h-12 mx-auto mb-3 text-[var(--foreground-secondary)]/50" />
              <p className="text-[var(--foreground-secondary)]">暂无可选套餐，请联系平台开通</p>
            </GlowCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan, index) => {
                const isCurrent = subscription?.planId === plan.id
                const price = period === "monthly" ? plan.priceMonthly : plan.priceYearly
                const isHighlight = index === 1
                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08, duration: 0.3 }}
                  >
                    <GlowCard
                      variant={isCurrent ? "success" : isHighlight ? "accent" : "primary"}
                      intensity={isHighlight ? "high" : "medium"}
                      className={`p-6 flex flex-col gap-4 h-full ${isHighlight ? "md:scale-[1.03]" : ""}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-[var(--foreground)]">{plan.name}</h3>
                          {plan.description && (
                            <p className="text-sm text-[var(--foreground-secondary)] mt-1 line-clamp-2">
                              {plan.description}
                            </p>
                          )}
                        </div>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--success)]/20 text-[var(--success)] flex-shrink-0">
                            当前
                          </span>
                        )}
                      </div>

                      <div className="py-3 border-y border-[var(--border)]">
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm text-[var(--foreground-secondary)]">¥</span>
                          <span className="font-mono text-3xl font-bold text-[var(--foreground)]">
                            {price.toLocaleString("zh-CN", { minimumFractionDigits: 0 })}
                          </span>
                          <span className="text-sm text-[var(--foreground-secondary)]">
                            / {period === "monthly" ? "月" : "年"}
                          </span>
                        </div>
                        {period === "yearly" && plan.priceMonthly > 0 && (
                          <p className="text-xs text-[var(--success)] mt-1">
                            相当于月付 ¥{(plan.priceYearly / 12).toLocaleString("zh-CN", { maximumFractionDigits: 2 })}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2.5 flex-1">
                        <FeatureRow icon={<Users className="w-4 h-4" />} label="咨询师席位" value={`${plan.maxSeats} 人`} />
                        <FeatureRow icon={<Mic className="w-4 h-4" />} label="月录音时长" value={`${plan.maxRecordingHours} 小时`} />
                        <FeatureRow icon={<Zap className="w-4 h-4" />} label="月 AI 调用" value={`${plan.maxAiCalls} 次`} />
                        <FeatureRow icon={<HardDrive className="w-4 h-4" />} label="存储空间" value={`${plan.maxStorage} GB`} />
                        <FeatureRow icon={<Clock className="w-4 h-4" />} label="免费试用" value={`${plan.trialDays} 天`} />
                      </div>

                      <button
                        onClick={() => handleSubscribe(plan)}
                        disabled={isCurrent}
                        className={`w-full py-2.5 rounded-lg font-medium transition-all ${
                          isCurrent
                            ? "bg-[var(--card)] text-[var(--foreground-secondary)] cursor-not-allowed"
                            : isHighlight
                              ? "bg-[var(--accent)] text-[var(--foreground)] hover:opacity-90"
                              : "bg-[var(--primary)]/15 text-[var(--primary)] hover:bg-[var(--primary)]/25 border border-[var(--primary)]/30"
                        }`}
                      >
                        {isCurrent ? "当前套餐" : subscription ? (plan.sortOrder > getCurrentPlanSortOrder() ? "升级到此套餐" : "续费此套餐") : "立即订阅"}
                      </button>
                    </GlowCard>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {/* 订单历史 */}
        <GlowCard variant="accent" className="p-6">
          <h2 className="text-lg font-bold text-[var(--foreground)] mb-4">订单记录</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">订单号</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">套餐</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">类型</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">金额</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">状态</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">创建时间</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[var(--foreground-secondary)]">
                      暂无订单记录
                    </td>
                  </tr>
                ) : (
                  orders.map((order, index) => {
                    const statusInfo = ORDER_STATUS_LABELS[order.status] || { text: order.status, color: "var(--foreground-secondary)" }
                    return (
                      <motion.tr
                        key={order.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--card)]/30 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono text-xs text-[var(--foreground)]">
                          {order.id.slice(-12)}
                        </td>
                        <td className="py-3 px-4 text-[var(--foreground)]">{order.planName}</td>
                        <td className="py-3 px-4 text-[var(--foreground-secondary)]">
                          {ORDER_TYPE_LABELS[order.type] || order.type}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[var(--foreground)]">
                          {formatCurrency(order.amount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {order.status === "pending" ? (
                            <button
                              onClick={() => router.push(`/admin/billing/payment/${order.id}`)}
                              className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--warning)]/20 text-[var(--warning)] hover:bg-[var(--warning)]/30 transition-colors"
                            >
                              去支付
                            </button>
                          ) : (
                            <span
                              className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: `color-mix(in srgb, ${statusInfo.color} 18%, transparent)`,
                                color: statusInfo.color,
                              }}
                            >
                              {statusInfo.text}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-[var(--foreground-secondary)]">
                          {formatDateTime(order.createdAt)}
                        </td>
                      </motion.tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </GlowCard>
      </div>

      {/* 支付方式选择弹窗 */}
      <AnimatePresence>
        {selectedPlan && (
          <PaymentMethodModal
            plan={selectedPlan}
            period={period}
            paymentMethod={paymentMethod}
            onMethodChange={setPaymentMethod}
            onConfirm={handleConfirmCreate}
            onClose={() => setSelectedPlan(null)}
            creating={creating}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function FeatureRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[var(--primary)]">{icon}</span>
      <span className="text-sm text-[var(--foreground-secondary)] flex-1">{label}</span>
      <span className="font-mono text-sm text-[var(--foreground)]">{value}</span>
    </div>
  )
}

function PaymentMethodModal({
  plan,
  period,
  paymentMethod,
  onMethodChange,
  onConfirm,
  onClose,
  creating,
}: {
  plan: Plan
  period: Period
  paymentMethod: PaymentMethod
  onMethodChange: (m: PaymentMethod) => void
  onConfirm: () => void
  onClose: () => void
  creating: boolean
}) {
  const price = period === "monthly" ? plan.priceMonthly : plan.priceYearly
  const methods: { value: PaymentMethod; label: string; desc: string }[] = [
    { value: "wechat", label: "微信支付", desc: "扫码即时完成" },
    { value: "alipay", label: "支付宝", desc: "扫码即时完成" },
    { value: "offline", label: "线下转账", desc: "需人工确认" },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(10, 14, 26, 0.8)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md"
      >
        <GlowCard variant="accent" intensity="high" className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-[var(--foreground)]">确认订阅</h3>
            <button
              onClick={onClose}
              className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 rounded-lg bg-[var(--card)]/50 border border-[var(--border)] mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--foreground-secondary)]">套餐</span>
              <span className="font-medium text-[var(--foreground)]">{plan.name}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--foreground-secondary)]">周期</span>
              <span className="font-medium text-[var(--foreground)]">
                {period === "monthly" ? "按月订阅" : "按年订阅"}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
              <span className="text-sm text-[var(--foreground-secondary)]">应付金额</span>
              <span className="font-mono text-xl font-bold text-[var(--primary)]">
                {formatCurrency(price)}
              </span>
            </div>
          </div>

          <p className="text-sm text-[var(--foreground-secondary)] mb-3">选择支付方式</p>
          <div className="space-y-2 mb-6">
            {methods.map((m) => (
              <button
                key={m.value}
                onClick={() => onMethodChange(m.value)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                  paymentMethod === m.value
                    ? "border-[var(--primary)] bg-[var(--primary)]/10"
                    : "border-[var(--border)] hover:border-[var(--primary)]/40"
                }`}
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-[var(--foreground)]">{m.label}</p>
                  <p className="text-xs text-[var(--foreground-secondary)]">{m.desc}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    paymentMethod === m.value
                      ? "border-[var(--primary)] bg-[var(--primary)]"
                      : "border-[var(--border)]"
                  }`}
                >
                  {paymentMethod === m.value && <Check className="w-3 h-3 text-[var(--background)]" />}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={onConfirm}
            disabled={creating}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-[var(--primary)] text-[var(--background)] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {creating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                创建订单中...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                确认创建订单
              </>
            )}
          </button>
        </GlowCard>
      </motion.div>
    </motion.div>
  )
}
