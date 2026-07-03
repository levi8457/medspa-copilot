"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  MessageCircle,
  Phone,
  Store,
  FileAudio,
  Mail,
  Plus,
  X,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  Send,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { TagCapsule } from "@/components/futuristic/TagCapsule"

// ============ 类型定义 ============

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

interface InteractionsApiResponse {
  items: InteractionRecord[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

interface CustomerInfo {
  id: string
  name: string
}

// ============ 静态配置 ============

const channelConfig: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  wechat: { label: "微信", icon: <MessageCircle className="w-3.5 h-3.5" />, color: "var(--success)" },
  phone: { label: "电话", icon: <Phone className="w-3.5 h-3.5" />, color: "var(--primary)" },
  in_store: { label: "到店", icon: <Store className="w-3.5 h-3.5" />, color: "var(--accent)" },
  recording: { label: "录音", icon: <FileAudio className="w-3.5 h-3.5" />, color: "var(--warning)" },
  campaign: { label: "活动", icon: <Mail className="w-3.5 h-3.5" />, color: "var(--danger)" },
  email: { label: "邮件", icon: <Mail className="w-3.5 h-3.5" />, color: "var(--primary)" },
}

const channelFilters = [
  { value: "", label: "全部渠道" },
  { value: "wechat", label: "微信" },
  { value: "phone", label: "电话" },
  { value: "in_store", label: "到店" },
  { value: "recording", label: "录音" },
  { value: "campaign", label: "活动" },
]

const directionFilters = [
  { value: "", label: "全部方向" },
  { value: "consultant_initiated", label: "主动联系" },
  { value: "customer_initiated", label: "客户发起" },
]

// ============ 页面组件 ============

export default function InteractionsPage() {
  const params = useParams<{ id: string }>()
  const customerId = params.id

  const [customer, setCustomer] = useState<CustomerInfo | null>(null)
  const [interactions, setInteractions] = useState<InteractionRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [channelFilter, setChannelFilter] = useState("")
  const [directionFilter, setDirectionFilter] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 新增表单
  const [formData, setFormData] = useState({
    channel: "wechat",
    direction: "consultant_initiated",
    occurredAt: new Date().toISOString().slice(0, 16),
    duration: "",
    content: "",
    summary: "",
    hasReply: false,
    replyTime: "",
  })

  const fetchInteractions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const paramsObj: Record<string, string> = { pageSize: "50" }
      if (channelFilter) paramsObj.channel = channelFilter
      // 注意：API 仅支持 channel 筛选，direction 在前端过滤
      const query = new URLSearchParams(paramsObj).toString()

      const res = await fetch(`/api/customers/${customerId}/interactions?${query}`)
      const result = await res.json()
      if (result.success) {
        const data = result.data as InteractionsApiResponse
        const items = Array.isArray(data?.items) ? data.items : []
        // direction 在前端过滤
        const filtered = directionFilter
          ? items.filter((i) => i.direction === directionFilter)
          : items
        setInteractions(filtered)
        setTotal(data?.total ?? items.length)
      } else {
        setError(result.error?.message || "获取互动记录失败")
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "获取互动记录失败"
      setError(msg)
      console.error("获取互动记录失败:", e)
    } finally {
      setLoading(false)
    }
  }, [customerId, channelFilter, directionFilter])

  const fetchCustomer = useCallback(async () => {
    try {
      const res = await fetch(`/api/customers/${customerId}`)
      const result = await res.json()
      if (result.success) {
        setCustomer({ id: result.data.id, name: result.data.name })
      }
    } catch (e) {
      console.error("获取客户信息失败:", e)
    }
  }, [customerId])

  useEffect(() => {
    fetchCustomer()
  }, [fetchCustomer])

  useEffect(() => {
    fetchInteractions()
  }, [fetchInteractions])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.content.trim() && !formData.summary.trim()) {
      setError("内容或摘要至少填一项")
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        channel: formData.channel,
        direction: formData.direction,
        occurredAt: new Date(formData.occurredAt).toISOString(),
        content: formData.content || undefined,
        summary: formData.summary || undefined,
        hasReply: formData.hasReply,
      }
      if (formData.duration) payload.duration = Number(formData.duration)
      if (formData.hasReply && formData.replyTime) {
        payload.replyTime = Number(formData.replyTime)
      }

      const res = await fetch(`/api/customers/${customerId}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!result.success) {
        throw new Error(result.error?.message || "添加失败")
      }
      setShowAddModal(false)
      setFormData({
        channel: "wechat",
        direction: "consultant_initiated",
        occurredAt: new Date().toISOString().slice(0, 16),
        duration: "",
        content: "",
        summary: "",
        hasReply: false,
        replyTime: "",
      })
      await fetchInteractions()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "添加失败"
      setError(msg)
      console.error("添加互动记录失败:", e)
    } finally {
      setSubmitting(false)
    }
  }

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
            <MessageCircle className="w-6 h-6 text-[var(--accent)]" />
            互动记录
            {customer && (
              <span className="text-base font-normal text-[var(--foreground-secondary)] ml-2">
                · {customer.name}
              </span>
            )}
          </h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--background)] font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          添加互动记录
        </button>
      </header>

      {/* 筛选 */}
      <GlowCard variant="primary" className="p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-[var(--foreground-secondary)]">
            <Filter className="w-4 h-4" />
            筛选：
          </div>

          {/* 渠道筛选 */}
          <div className="flex items-center gap-1">
            {channelFilters.map((f) => (
              <button
                key={f.value || "all-channel"}
                onClick={() => setChannelFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  channelFilter === f.value
                    ? "bg-[var(--primary)] text-[var(--background)]"
                    : "bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-[var(--border)]" />

          {/* 方向筛选 */}
          <div className="flex items-center gap-1">
            {directionFilters.map((f) => (
              <button
                key={f.value || "all-dir"}
                onClick={() => setDirectionFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  directionFilter === f.value
                    ? "bg-[var(--accent)] text-[var(--background)]"
                    : "bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--accent)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="ml-auto text-sm text-[var(--foreground-secondary)]">
            当前 {interactions.length} 条 / 共 {total} 条
          </div>
        </div>
      </GlowCard>

      {error && (
        <GlowCard variant="danger" className="p-4 mb-6">
          <div className="flex items-center gap-2 text-[var(--danger)]">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </GlowCard>
      )}

      {/* 互动列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-10 h-10 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : interactions.length > 0 ? (
        <GlowCard variant="primary" className="p-6">
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-[var(--border)]" />
            <div className="space-y-4">
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
                    transition={{ delay: idx * 0.03, duration: 0.3 }}
                    className="relative pl-12"
                  >
                    <div
                      className="absolute left-1 top-2 w-7 h-7 rounded-full flex items-center justify-center border"
                      style={{
                        backgroundColor: `${channel.color}20`,
                        color: channel.color,
                        borderColor: `${channel.color}40`,
                      }}
                    >
                      {channel.icon}
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors">
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-sm font-medium"
                            style={{ color: channel.color }}
                          >
                            {channel.label}
                          </span>
                          <TagCapsule
                            label={isOutbound ? "主动联系" : "客户发起"}
                            variant={isOutbound ? "primary" : "accent"}
                            size="sm"
                          />
                          {item.hasReply && (
                            <TagCapsule
                              label={`已回复${item.replyTime ? ` · ${item.replyTime}分钟` : ""}`}
                              variant="success"
                              size="sm"
                            />
                          )}
                          {item.duration && (
                            <span className="text-xs text-[var(--foreground-muted)]">
                              时长 {Math.floor(item.duration / 60)}分{item.duration % 60}秒
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[var(--foreground-muted)]">
                          {new Date(item.occurredAt).toLocaleString("zh-CN")}
                        </span>
                      </div>

                      {item.summary && (
                        <p className="text-sm text-[var(--foreground)] mb-1 font-medium">
                          {item.summary}
                        </p>
                      )}
                      {item.content && (
                        <p className="text-sm text-[var(--foreground-secondary)] whitespace-pre-wrap line-clamp-3">
                          {item.content}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </GlowCard>
      ) : (
        <GlowCard variant="accent" className="p-12 text-center">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 text-[var(--accent)] opacity-50" />
          <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">暂无互动记录</h3>
          <p className="text-[var(--foreground-secondary)] text-sm mb-4">
            添加客户的电话、微信、到店等互动记录，AI 将基于此分析客户健康度
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加第一条记录
          </button>
        </GlowCard>
      )}

      {/* 添加互动记录弹窗 */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] backdrop-blur-sm p-4"
            onClick={() => !submitting && setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg"
            >
              <GlowCard variant="primary" className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-[var(--foreground)]">添加互动记录</h2>
                  <button
                    onClick={() => !submitting && setShowAddModal(false)}
                    className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAdd} className="space-y-4">
                  {/* 渠道 + 方向 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[var(--foreground-secondary)] mb-1.5">
                        渠道
                      </label>
                      <select
                        value={formData.channel}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, channel: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--primary)]"
                      >
                        {channelFilters
                          .filter((f) => f.value)
                          .map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.label}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--foreground-secondary)] mb-1.5">
                        方向
                      </label>
                      <select
                        value={formData.direction}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, direction: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--primary)]"
                      >
                        <option value="consultant_initiated">主动联系</option>
                        <option value="customer_initiated">客户发起</option>
                      </select>
                    </div>
                  </div>

                  {/* 时间 */}
                  <div>
                    <label className="block text-xs text-[var(--foreground-secondary)] mb-1.5">
                      发生时间
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.occurredAt}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, occurredAt: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>

                  {/* 时长 */}
                  <div>
                    <label className="block text-xs text-[var(--foreground-secondary)] mb-1.5">
                      时长（秒，可选）
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.duration}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, duration: e.target.value }))
                      }
                      placeholder="例如：300"
                      className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>

                  {/* 摘要 */}
                  <div>
                    <label className="block text-xs text-[var(--foreground-secondary)] mb-1.5">
                      摘要（一句话概括）
                    </label>
                    <input
                      type="text"
                      value={formData.summary}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, summary: e.target.value }))
                      }
                      placeholder="例如：客户咨询玻尿酸项目价格"
                      className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>

                  {/* 内容 */}
                  <div>
                    <label className="block text-xs text-[var(--foreground-secondary)] mb-1.5">
                      详细内容（可选）
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, content: e.target.value }))
                      }
                      placeholder="记录对话要点、客户反馈等..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--primary)] resize-none"
                    />
                  </div>

                  {/* 已回复 */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasReply}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, hasReply: e.target.checked }))
                        }
                        className="rounded border-[var(--border)] bg-[var(--background)] text-[var(--primary)] focus:ring-[var(--primary)]"
                      />
                      <span className="text-sm text-[var(--foreground)]">客户已回复</span>
                    </label>
                    {formData.hasReply && (
                      <input
                        type="number"
                        min="0"
                        value={formData.replyTime}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, replyTime: e.target.value }))
                        }
                        placeholder="回复耗时（分钟）"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--primary)]"
                      />
                    )}
                  </div>

                  {/* 提交 */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => !submitting && setShowAddModal(false)}
                      disabled={submitting}
                      className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:border-[var(--foreground-secondary)] transition-colors text-sm disabled:opacity-50"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--background)] font-medium hover:opacity-90 transition-opacity text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          提交中...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          提交
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </GlowCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
