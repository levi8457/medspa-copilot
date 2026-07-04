"use client"

import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CheckCircle,
  XCircle,
  Plus,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
  Inbox,
  Send,
  CheckCheck,
  X,
} from "lucide-react"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { apiFetch } from "@/lib/api-fetch"

type ApprovalType = "discount" | "project_plan" | "customer_transfer" | "refund"
type ApprovalStatus = "pending" | "approved" | "rejected" | "cancelled"
type TabKey = "pending" | "applied" | "completed"

const TYPE_LABELS: Record<ApprovalType, string> = {
  discount: "折扣审批",
  project_plan: "项目方案审批",
  customer_transfer: "客户转移审批",
  refund: "退款审批",
}

const STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: "待审批",
  approved: "已通过",
  rejected: "已驳回",
  cancelled: "已取消",
}

const STATUS_COLORS: Record<ApprovalStatus, string> = {
  pending: "var(--warning)",
  approved: "var(--success)",
  rejected: "var(--danger)",
  cancelled: "var(--foreground-secondary)",
}

interface CurrentStepInfo {
  stepOrder: number
  approverRole: string
  approverName: string | null
}

interface ApprovalItem {
  id: string
  type: ApprovalType
  title: string
  applicantId: string
  applicantName: string
  status: ApprovalStatus
  content: string | null
  customerId: string | null
  amount: number | null
  currentStep: number
  totalSteps: number
  createdAt: string
  updatedAt: string
  currentStepInfo: CurrentStepInfo | null
}

interface ApprovalStep {
  id: string
  stepOrder: number
  approverId: string | null
  approverName: string | null
  approverRole: string
  status: ApprovalStatus
  comment: string | null
  approvedAt: string | null
}

interface ApprovalDetail extends ApprovalItem {
  steps: ApprovalStep[]
}

interface Stats {
  pending: number
  applied: number
  completed: number
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "pending", label: "待审批" },
  { key: "applied", label: "我发起的" },
  { key: "completed", label: "已完成" },
]
export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>([])
  const [stats, setStats] = useState<Stats>({ pending: 0, applied: 0, completed: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>("pending")

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailMap, setDetailMap] = useState<Record<string, ApprovalDetail>>({})
  const [detailLoading, setDetailLoading] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    type: "discount" as ApprovalType,
    title: "",
    content: "",
    amount: "",
  })
  const [createLoading, setCreateLoading] = useState(false)

  const [rejectTarget, setRejectTarget] = useState<ApprovalItem | null>(null)
  const [rejectComment, setRejectComment] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  const fetchList = useCallback(async (tab: TabKey) => {
    try {
      setLoading(true)
      const res = await apiFetch(`/api/admin/approvals?tab=${tab}`)
      const result = await res.json()
      if (result.success) {
        setItems(result.data.items)
        setStats(result.data.stats)
      }
    } catch (error) {
      console.error("获取审批列表失败:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchList(activeTab)
  }, [activeTab, fetchList])

  const fetchDetail = async (id: string) => {
    try {
      setDetailLoading(true)
      const res = await apiFetch(`/api/admin/approvals/${id}`)
      const result = await res.json()
      if (result.success) {
        setDetailMap((prev) => ({ ...prev, [id]: result.data }))
      }
    } catch (error) {
      console.error("获取审批详情失败:", error)
    } finally {
      setDetailLoading(false)
    }
  }

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (!detailMap[id]) {
      fetchDetail(id)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      setActionLoading(true)
      const res = await apiFetch(`/api/admin/approvals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      })
      const result = await res.json()
      if (result.success) {
        setExpandedId(null)
        await fetchList(activeTab)
      } else {
        alert(result.error?.message || "审批失败")
      }
    } catch (error) {
      console.error("审批操作失败:", error)
      alert("审批操作失败")
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    if (!rejectComment.trim()) {
      alert("请填写驳回意见")
      return
    }
    try {
      setActionLoading(true)
      const res = await apiFetch(`/api/admin/approvals/${rejectTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", comment: rejectComment }),
      })
      const result = await res.json()
      if (result.success) {
        setRejectTarget(null)
        setRejectComment("")
        setExpandedId(null)
        await fetchList(activeTab)
      } else {
        alert(result.error?.message || "驳回失败")
      }
    } catch (error) {
      console.error("驳回操作失败:", error)
      alert("驳回操作失败")
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!createForm.title.trim()) {
      alert("请填写审批标题")
      return
    }
    try {
      setCreateLoading(true)
      const amount = createForm.amount ? Number(createForm.amount) : null
      const res = await apiFetch("/api/admin/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: createForm.type,
          title: createForm.title,
          content: createForm.content,
          amount,
        }),
      })
      const result = await res.json()
      if (result.success) {
        setShowCreate(false)
        setCreateForm({ type: "discount", title: "", content: "", amount: "" })
        setActiveTab("applied")
      } else {
        alert(result.error?.message || "发起审批失败")
      }
    } catch (error) {
      console.error("发起审批失败:", error)
      alert("发起审批失败")
    } finally {
      setCreateLoading(false)
    }
  }
  const formatAmount = (v: number | null) => {
    if (v === null || v === undefined) return "-"
    return `¥${v.toLocaleString()}`
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-8 w-48 bg-[var(--card)] animate-pulse rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-[var(--card)] animate-pulse rounded-xl" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-[var(--card)] animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const statCards = [
    { key: "pending" as const, label: "待审批", value: stats.pending, icon: <Inbox />, color: "var(--warning)" },
    { key: "applied" as const, label: "已发起", value: stats.applied, icon: <Send />, color: "var(--primary)" },
    { key: "completed" as const, label: "已完成", value: stats.completed, icon: <CheckCheck />, color: "var(--success)" },
  ]

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">审批中心</h1>
            <p className="text-[var(--foreground-secondary)] mt-1">
              管理折扣、项目方案、客户转移与退款审批
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            发起审批
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {statCards.map((s) => (
            <GlowCard key={s.key} className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--foreground-secondary)]">{s.label}</p>
                  <p className="text-3xl font-bold mt-2 font-mono" style={{ color: s.color }}>
                    {s.value}
                  </p>
                </div>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `color-mix(in srgb, ${s.color} 15%, transparent)`, color: s.color }}
                >
                  {s.icon}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>
        {/* Tabs */}
        <div className="flex items-center gap-2 p-1 bg-[var(--card)] rounded-lg w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-[var(--primary)] text-[var(--background)]"
                  : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
              }`}
            >
              {tab.label}
              <span className="ml-2 text-xs opacity-80">
                {tab.key === "pending" ? stats.pending : tab.key === "applied" ? stats.applied : stats.completed}
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-4">
          <AnimatePresence>
            {items.map((item, index) => {
              const expanded = expandedId === item.id
              const detail = detailMap[item.id]
              const canApprove = activeTab === "pending" && item.status === "pending"
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlowCard className="overflow-hidden">
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => toggleExpand(item.id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <span
                              className="px-2 py-0.5 rounded-md text-xs font-medium"
                              style={{
                                backgroundColor: "color-mix(in srgb, var(--accent) 18%, transparent)",
                                color: "var(--accent)",
                              }}
                            >
                              {TYPE_LABELS[item.type]}
                            </span>
                            <span
                              className="px-2 py-0.5 rounded-md text-xs font-medium"
                              style={{
                                backgroundColor: `color-mix(in srgb, ${STATUS_COLORS[item.status]} 18%, transparent)`,
                                color: STATUS_COLORS[item.status],
                              }}
                            >
                              {STATUS_LABELS[item.status]}
                            </span>
                            <span className="font-medium text-[var(--foreground)] truncate">
                              {item.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-[var(--foreground-secondary)] flex-wrap">
                            <span>申请人：{item.applicantName}</span>
                            <span>金额：{formatAmount(item.amount)}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(item.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-secondary)]">
                            <span className="font-mono text-[var(--primary)]">
                              {item.currentStep}/{item.totalSteps}
                            </span>
                            <span>步骤</span>
                          </div>
                          {expanded ? (
                            <ChevronUp className="w-4 h-4 text-[var(--foreground-secondary)]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[var(--foreground-secondary)]" />
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Expandable Detail */}
                    <AnimatePresence>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden border-t border-[var(--border)]"
                        >
                          <div className="p-4 space-y-4">
                            <div>
                              <p className="text-sm text-[var(--foreground-secondary)] mb-1 flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5" />
                                审批内容
                              </p>
                              <p className="text-[var(--foreground)] whitespace-pre-wrap text-sm">
                                {item.content || "无"}
                              </p>
                            </div>

                            <div>
                              <p className="text-sm text-[var(--foreground-secondary)] mb-3">
                                审批流程
                              </p>
                              {detailLoading && !detail ? (
                                <p className="text-sm text-[var(--foreground-secondary)]">加载中...</p>
                              ) : detail ? (
                                <div className="space-y-3">
                                  {detail.steps.map((step, i) => (
                                    <motion.div
                                      key={step.id}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: i * 0.08 }}
                                      className="flex items-start gap-3"
                                    >
                                      <div className="flex flex-col items-center">
                                        <div
                                          className="w-3 h-3 rounded-full mt-1"
                                          style={{ backgroundColor: STATUS_COLORS[step.status] }}
                                        />
                                        {i < detail.steps.length - 1 && (
                                          <div className="w-0.5 h-8 bg-[var(--border)] mt-1" />
                                        )}
                                      </div>
                                      <div className="flex-1 pb-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-sm text-[var(--foreground)]">
                                            步骤 {step.stepOrder}
                                          </span>
                                          <span
                                            className="px-1.5 py-0.5 rounded text-xs"
                                            style={{
                                              backgroundColor: `color-mix(in srgb, ${STATUS_COLORS[step.status]} 18%, transparent)`,
                                              color: STATUS_COLORS[step.status],
                                            }}
                                          >
                                            {STATUS_LABELS[step.status]}
                                          </span>
                                          <span className="text-xs text-[var(--foreground-secondary)]">
                                            审批人：
                                            {step.approverName || `待${step.approverRole === "org_admin" ? "机构管理员" : "管理员"}处理`}
                                          </span>
                                        </div>
                                        {step.comment && (
                                          <p className="text-xs text-[var(--foreground-secondary)] mt-1">
                                            意见：{step.comment}
                                          </p>
                                        )}
                                        {step.approvedAt && (
                                          <p className="text-xs text-[var(--foreground-muted)] mt-1">
                                            {new Date(step.approvedAt).toLocaleString()}
                                          </p>
                                        )}
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                            {canApprove && (
                              <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setRejectTarget(item)
                                    setRejectComment("")
                                  }}
                                  disabled={actionLoading}
                                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                                  style={{
                                    backgroundColor: "color-mix(in srgb, var(--danger) 18%, transparent)",
                                    color: "var(--danger)",
                                  }}
                                >
                                  <XCircle className="w-4 h-4" />
                                  驳回
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleApprove(item.id)
                                  }}
                                  disabled={actionLoading}
                                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                                  style={{
                                    backgroundColor: "color-mix(in srgb, var(--success) 18%, transparent)",
                                    color: "var(--success)",
                                  }}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  通过
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </GlowCard>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {items.length === 0 && (
            <GlowCard className="p-12 text-center">
              <Inbox className="w-12 h-12 text-[var(--foreground-secondary)] mx-auto mb-4" />
              <p className="text-[var(--foreground)] font-medium">暂无审批记录</p>
              <p className="text-sm text-[var(--foreground-secondary)] mt-1">
                {activeTab === "pending"
                  ? "没有待您处理的审批"
                  : activeTab === "applied"
                    ? "您还没有发起过审批"
                    : "暂无已完成的审批"}
              </p>
            </GlowCard>
          )}
        </div>

{/* Create Modal */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setShowCreate(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-6 w-full max-w-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-[var(--foreground)]">发起审批</h2>
                  <button
                    onClick={() => setShowCreate(false)}
                    className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[var(--foreground-secondary)] mb-1">
                      审批类型
                    </label>
                    <select
                      value={createForm.type}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, type: e.target.value as ApprovalType })
                      }
                      className="w-full p-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    >
                      {(Object.keys(TYPE_LABELS) as ApprovalType[]).map((t) => (
                        <option key={t} value={t}>
                          {TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-[var(--foreground-secondary)] mb-1">
                      标题
                    </label>
                    <input
                      value={createForm.title}
                      onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                      className="w-full p-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      placeholder="请输入审批标题"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--foreground-secondary)] mb-1">
                      内容
                    </label>
                    <textarea
                      value={createForm.content}
                      onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                      className="w-full p-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] h-24 resize-none"
                      placeholder="请输入内容说明"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[var(--foreground-secondary)] mb-1">
                      金额（可选）
                    </label>
                    <input
                      type="number"
                      value={createForm.amount}
                      onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                      className="w-full p-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      placeholder="请输入金额"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="px-4 py-2 text-[var(--foreground-secondary)] hover:bg-[var(--border)] rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={createLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    提交
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

{/* Reject Modal */}
        <AnimatePresence>
          {rejectTarget && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => {
                setRejectTarget(null)
                setRejectComment("")
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-6 w-full max-w-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-[var(--foreground)]">驳回审批</h2>
                  <button
                    onClick={() => {
                      setRejectTarget(null)
                      setRejectComment("")
                    }}
                    className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-sm text-[var(--foreground-secondary)] mb-1">
                  审批标题：
                  <span className="text-[var(--foreground)]">{rejectTarget.title}</span>
                </p>

                <div className="mt-4">
                  <label className="block text-sm text-[var(--foreground-secondary)] mb-1">
                    驳回意见 <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <textarea
                    value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value)}
                    className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--danger)] h-28 resize-none"
                    placeholder="请填写驳回原因（必填）"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setRejectTarget(null)
                      setRejectComment("")
                    }}
                    className="px-4 py-2 text-[var(--foreground-secondary)] hover:bg-[var(--border)] rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--danger) 18%, transparent)",
                      color: "var(--danger)",
                    }}
                  >
                    <XCircle className="w-4 h-4" />
                    确认驳回
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}