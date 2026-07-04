"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  CreditCard,
  RefreshCw,
  Smartphone,
  Wallet,
} from "lucide-react"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { apiFetch } from "@/lib/api-fetch"

interface OrderDetail {
  id: string
  planId: string
  planName: string
  planDescription: string | null
  type: string
  amount: number
  period: string
  status: string
  paymentMethod: string | null
  paymentNo: string | null
  note: string | null
  paidAt: string | null
  createdAt: string
  plan: {
    id: string
    name: string
    description: string | null
    maxSeats: number
    priceMonthly: number
    priceYearly: number
  }
  payments: Array<{
    id: string
    amount: number
    method: string
    status: string
    transactionNo: string | null
    paidAt: string | null
    createdAt: string
  }>
}

interface PayResult {
  orderId: string
  status: string
  transactionNo: string
  paidAt: string
  amount: number
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string }
}

type PaymentMethod = "wechat" | "alipay" | "offline"

const ORDER_TYPE_LABELS: Record<string, string> = {
  new: "新订",
  renew: "续费",
  upgrade: "升级",
}

function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  return `${date} ${time}`
}

export default function PaymentPage() {
  const router = useRouter()
  const params = useParams<{ orderId: string }>()
  const orderId = params.orderId

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("wechat")
  const [paying, setPaying] = useState(false)
  const [payResult, setPayResult] = useState<PayResult | null>(null)

  const fetchOrder = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/orders/${orderId}`)
      const json: ApiResponse<OrderDetail> = await res.json()
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message || "获取订单失败")
      }
      setOrder(json.data)
      if (json.data.paymentMethod) {
        setPaymentMethod(json.data.paymentMethod as PaymentMethod)
      }
      // 若已支付，直接展示成功态
      if (json.data.status === "paid") {
        setPayResult({
          orderId: json.data.id,
          status: "paid",
          transactionNo: json.data.paymentNo || json.data.payments[0]?.transactionNo || "",
          paidAt: json.data.paidAt || json.data.payments[0]?.paidAt || json.data.createdAt,
          amount: json.data.amount,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取订单失败")
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  const handlePay = async () => {
    setPaying(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/orders/${orderId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod }),
      })
      const json: ApiResponse<PayResult> = await res.json()
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message || "支付失败")
      }
      setPayResult(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "支付失败")
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="h-8 w-32 bg-[var(--card)] animate-pulse rounded" />
          <div className="h-96 bg-[var(--card)] animate-pulse rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <button
          onClick={() => router.push("/admin/billing")}
          className="flex items-center gap-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回订阅管理
        </button>

        {error && (
          <div className="p-4 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[var(--danger)] flex-shrink-0" />
            <p className="text-sm text-[var(--danger)]">{error}</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {payResult ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <GlowCard variant="success" intensity="high" className="p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 mx-auto rounded-full bg-[var(--success)]/15 flex items-center justify-center mb-5"
                >
                  <CheckCircle2 className="w-12 h-12 text-[var(--success)]" />
                </motion.div>
                <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">支付成功</h2>
                <p className="text-[var(--foreground-secondary)] mb-6">
                  订阅已激活，感谢您的支持
                </p>

                <div className="p-4 rounded-lg bg-[var(--card)]/50 border border-[var(--border)] space-y-2 text-left mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--foreground-secondary)]">订单号</span>
                    <span className="font-mono text-[var(--foreground)]">
                      {payResult.orderId.slice(-12)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--foreground-secondary)]">支付金额</span>
                    <span className="font-mono text-[var(--primary)]">
                      {formatCurrency(payResult.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--foreground-secondary)]">交易流水号</span>
                    <span className="font-mono text-xs text-[var(--foreground)]">
                      {payResult.transactionNo}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--foreground-secondary)]">支付时间</span>
                    <span className="text-[var(--foreground)]">
                      {formatDateTime(payResult.paidAt)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => router.push("/admin/billing")}
                  className="w-full py-3 rounded-lg bg-[var(--primary)] text-[var(--background)] font-medium hover:opacity-90 transition-opacity"
                >
                  返回订阅管理
                </button>
              </GlowCard>
            </motion.div>
          ) : order ? (
            <motion.div
              key="pay"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* 订单信息 */}
              <GlowCard variant="primary" className="p-6">
                <h1 className="text-xl font-bold text-[var(--foreground)] mb-4">订单支付</h1>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--foreground-secondary)]">套餐名称</span>
                    <span className="font-medium text-[var(--foreground)]">{order.planName}</span>
                  </div>
                  {order.plan.description && (
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-sm text-[var(--foreground-secondary)] flex-shrink-0">套餐说明</span>
                      <span className="text-sm text-[var(--foreground)] text-right">{order.plan.description}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--foreground-secondary)]">订单类型</span>
                    <span className="text-[var(--foreground)]">
                      {ORDER_TYPE_LABELS[order.type] || order.type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--foreground-secondary)]">订阅周期</span>
                    <span className="text-[var(--foreground)]">
                      {order.period === "monthly" ? "按月" : "按年"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--foreground-secondary)]">订单号</span>
                    <span className="font-mono text-xs text-[var(--foreground)]">{order.id.slice(-12)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--foreground-secondary)]">创建时间</span>
                    <span className="text-sm text-[var(--foreground)]">{formatDateTime(order.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                    <span className="text-base font-medium text-[var(--foreground)]">应付金额</span>
                    <span className="font-mono text-3xl font-bold text-[var(--primary)]">
                      {formatCurrency(order.amount)}
                    </span>
                  </div>
                </div>
              </GlowCard>

              {/* 支付方式选择 */}
              <GlowCard variant="accent" className="p-6">
                <h2 className="text-base font-bold text-[var(--foreground)] mb-4">选择支付方式</h2>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <PaymentOption
                    icon={<Smartphone className="w-5 h-5" />}
                    label="微信支付"
                    selected={paymentMethod === "wechat"}
                    onClick={() => setPaymentMethod("wechat")}
                  />
                  <PaymentOption
                    icon={<Wallet className="w-5 h-5" />}
                    label="支付宝"
                    selected={paymentMethod === "alipay"}
                    onClick={() => setPaymentMethod("alipay")}
                  />
                  <PaymentOption
                    icon={<CreditCard className="w-5 h-5" />}
                    label="线下转账"
                    selected={paymentMethod === "offline"}
                    onClick={() => setPaymentMethod("offline")}
                  />
                </div>

                {/* Mock 二维码区域 */}
                {(paymentMethod === "wechat" || paymentMethod === "alipay") && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6"
                  >
                    <div className="flex flex-col items-center p-4 rounded-lg bg-[var(--card)]/30 border border-[var(--border)]">
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: paymentMethod === "wechat" ? "#07C160" : "#1677FF",
                          }}
                        />
                        <span className="text-sm text-[var(--foreground-secondary)]">
                          {paymentMethod === "wechat" ? "微信" : "支付宝"}扫码支付（模拟）
                        </span>
                      </div>
                      <MockQRCode method={paymentMethod} />
                      <p className="text-xs text-[var(--foreground-secondary)] mt-3">
                        请使用{paymentMethod === "wechat" ? "微信" : "支付宝"}扫描上方二维码
                      </p>
                    </div>
                  </motion.div>
                )}

                {paymentMethod === "offline" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 p-4 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/30"
                  >
                    <p className="text-sm text-[var(--warning)] mb-2">线下转账说明</p>
                    <p className="text-xs text-[var(--foreground-secondary)] leading-relaxed">
                      请将款项转账至平台对公账户，转账后联系客服确认。点击下方「确认支付」可模拟到账即时开通（Mock 模式）。
                    </p>
                  </motion.div>
                )}

                <button
                  onClick={handlePay}
                  disabled={paying}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-[var(--primary)] text-[var(--background)] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {paying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      支付处理中...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      确认支付 {formatCurrency(order.amount)}
                    </>
                  )}
                </button>
              </GlowCard>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}

function PaymentOption({
  icon,
  label,
  selected,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
        selected
          ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
          : "border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)]/40"
      }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}

// Mock 二维码占位图（纯 CSS 像素图案）
function MockQRCode({ method }: { method: PaymentMethod }) {
  const accent = method === "wechat" ? "#07C160" : "#1677FF"
  // 21x21 固定伪随机图案（含三个定位角）
  const size = 21
  const pattern: boolean[][] = []
  // 用确定性的伪随机生成稳定图案
  const seed = method === "wechat" ? 7 : 13
  for (let y = 0; y < size; y++) {
    const row: boolean[] = []
    for (let x = 0; x < size; x++) {
      const isFinder = isFinderPattern(x, y)
      if (isFinder !== null) {
        row.push(isFinder)
      } else {
        row.push(((x * seed + y * (seed + 3) + x * y) % 7) % 2 === 0)
      }
    }
    pattern.push(row)
  }

  function isFinderPattern(x: number, y: number): boolean | null {
    const inBox = (bx: number, by: number) =>
      x >= bx && x < bx + 7 && y >= by && y < by + 7
    if (inBox(0, 0) || inBox(size - 7, 0) || inBox(0, size - 7)) {
      const lx = inBox(0, 0) ? x : inBox(size - 7, 0) ? x - (size - 7) : x
      const ly = inBox(0, 0) ? y : inBox(0, size - 7) ? y - (size - 7) : y
      if (lx === 0 || lx === 6 || ly === 0 || ly === 6) return true
      if (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4) return true
      return false
    }
    return null
  }

  return (
    <div
      className="p-3 rounded-lg"
      style={{ backgroundColor: "#fff" }}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${size}, 8px)`,
          gridTemplateRows: `repeat(${size}, 8px)`,
          gap: "0",
        }}
      >
        {pattern.flat().map((on, i) => (
          <div
            key={i}
            style={{
              width: "8px",
              height: "8px",
              backgroundColor: on ? "#0A0E1A" : "#fff",
            }}
          />
        ))}
      </div>
      {/* 中心 logo 占位 */}
      <div
        className="flex items-center justify-center -mt-12 mx-auto w-8 h-8 rounded-md relative z-10"
        style={{ backgroundColor: accent }}
      >
        <Smartphone className="w-4 h-4 text-white" />
      </div>
    </div>
  )
}
