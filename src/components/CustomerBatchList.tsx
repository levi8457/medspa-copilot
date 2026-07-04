"use client"

import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import {
  Phone,
  MessageCircle,
  ChevronRight,
  CheckSquare,
  Square,
  CheckCheck,
  X,
  Loader2,
  Sparkles,
  CheckCircle,
  SkipForward,
  Tag,
  UserCog,
  Copy,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { EnergyRing } from "@/components/futuristic/EnergyRing"
import { TagCapsule } from "@/components/futuristic/TagCapsule"
import { apiFetch } from "@/lib/api-fetch"

// ============ 类型定义 ============

export interface CustomerListItem {
  id: string
  name: string
  phone: string | null
  wechat: string | null
  status: string
  tier: string | null
  tags: Array<{ dimension: string; value: string }>
  _count: {
    audioRecords: number
    followUpPlans: number
  }
}

export interface ConsultantOption {
  id: string
  name: string
}

interface CustomerBatchListProps {
  customers: CustomerListItem[]
  tierMap: Record<string, { label: string; color: string }>
  statusMap: Record<string, { label: string; color: string }>
  userRole: "super_admin" | "org_admin" | "consultant"
  consultants?: ConsultantOption[]
}

// ============ 批量操作类型 ============

type BatchAction =
  | "mark_done"
  | "mark_skipped"
  | "add_tag"
  | "assign"
  | "generate_scripts"

interface ScriptResult {
  customerId: string
  customerName: string
  script: string
  subjectLine?: string
  keyPoints?: string[]
  compliancePassed: boolean
  complianceRiskLevel?: string
  complianceWarnings?: string[]
  error?: string
}

interface BatchResponse {
  affected: number
  details: Record<string, unknown>
}

// ============ 工具函数 ============

function maskPhone(phone: string | null): string {
  if (!phone || phone.length < 7) return phone || ""
  return phone.slice(0, 3) + "****" + phone.slice(7)
}

// ============ 组件 ============

export function CustomerBatchList({
  customers,
  tierMap,
  statusMap,
  userRole,
  consultants = [],
}: CustomerBatchListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [activeAction, setActiveAction] = useState<BatchAction | null>(null)
  const [scriptResults, setScriptResults] = useState<ScriptResult[] | null>(null)

  // 弹窗表单状态
  const [skipReason, setSkipReason] = useState("")
  const [tagKey, setTagKey] = useState("")
  const [tagValue, setTagValue] = useState("")
  const [assignTargetId, setAssignTargetId] = useState("")
  const [scriptScene, setScriptScene] = useState("")

  const isAdmin = userRole === "super_admin" || userRole === "org_admin"

  const allSelected = useMemo(
    () => customers.length > 0 && selectedIds.size === customers.length,
    [customers, selectedIds]
  )

  const selectedCount = selectedIds.size
  const selectedIdArray = useMemo(() => Array.from(selectedIds), [selectedIds])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(customers.map((c) => c.id)))
    }
  }

  const invertSelection = () => {
    setSelectedIds((prev) => {
      const next = new Set<string>()
      for (const c of customers) {
        if (!prev.has(c.id)) {
          next.add(c.id)
        }
      }
      return next
    })
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setActiveAction(null)
    setScriptResults(null)
    setError(null)
    setSuccessMsg(null)
  }

  // ============ 批量操作执行 ============

  const callBatchApi = async (payload: Record<string, unknown>) => {
    const res = await apiFetch("/api/customers/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const result = await res.json()
    if (!result.success) {
      throw new Error(result.error?.message || "批量操作失败")
    }
    return result.data as BatchResponse
  }

  const handleBatchDone = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const data = await callBatchApi({
        action: "mark_done",
        customerIds: selectedIdArray,
      })
      setSuccessMsg(`已批量完成 ${data.affected} 个任务`)
      setActiveAction(null)
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败")
    } finally {
      setSubmitting(false)
    }
  }

  const handleBatchSkip = async () => {
    if (!skipReason.trim()) {
      setError("请填写跳过原因")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const data = await callBatchApi({
        action: "mark_skipped",
        customerIds: selectedIdArray,
        reason: skipReason,
      })
      setSuccessMsg(`已批量跳过 ${data.affected} 个任务`)
      setSkipReason("")
      setActiveAction(null)
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败")
    } finally {
      setSubmitting(false)
    }
  }

  const handleBatchAddTag = async () => {
    if (!tagKey.trim() || !tagValue.trim()) {
      setError("请填写标签键和值")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const data = await callBatchApi({
        action: "add_tag",
        customerIds: selectedIdArray,
        payload: { tagKey, tagValue },
      })
      setSuccessMsg(`已为 ${data.affected} 个客户打上标签「${tagKey}: ${tagValue}」`)
      setTagKey("")
      setTagValue("")
      setActiveAction(null)
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败")
    } finally {
      setSubmitting(false)
    }
  }

  const handleBatchAssign = async () => {
    if (!assignTargetId) {
      setError("请选择目标咨询师")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const data = await callBatchApi({
        action: "assign",
        customerIds: selectedIdArray,
        payload: { consultantId: assignTargetId },
      })
      const targetName =
        consultants.find((c) => c.id === assignTargetId)?.name ?? "未知"
      setSuccessMsg(`已将 ${data.affected} 个客户分配给 ${targetName}`)
      setAssignTargetId("")
      setActiveAction(null)
      setTimeout(() => {
        setSuccessMsg(null)
        // 刷新页面以反映分配结果
        window.location.reload()
      }, 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败")
    } finally {
      setSubmitting(false)
    }
  }

  const handleBatchScripts = async () => {
    setSubmitting(true)
    setError(null)
    setScriptResults(null)
    try {
      const res = await apiFetch("/api/customers/batch/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerIds: selectedIdArray,
          scene: scriptScene || undefined,
        }),
      })
      const result = await res.json()
      if (!result.success) {
        throw new Error(result.error?.message || "批量生成话术失败")
      }
      setScriptResults(result.data.scripts as ScriptResult[])
      setActiveAction(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative">
      {/* 顶部选择栏 */}
      {customers.length > 0 && (
        <div className="flex items-center gap-3 mb-4 px-3 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)]">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--primary)] transition-colors"
          >
            {allSelected ? (
              <CheckCheck className="w-4 h-4 text-[var(--primary)]" />
            ) : (
              <CheckSquare className="w-4 h-4" />
            )}
            {allSelected ? "取消全选" : "全选"}
          </button>
          <span className="text-[var(--border)]">|</span>
          <button
            onClick={invertSelection}
            className="text-sm text-[var(--foreground-secondary)] hover:text-[var(--accent)] transition-colors"
          >
            反选
          </button>
          {selectedCount > 0 && (
            <>
              <span className="text-[var(--border)]">|</span>
              <span className="text-sm text-[var(--primary)]">
                已选 {selectedCount} 个
              </span>
              <button
                onClick={clearSelection}
                className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
              >
                清除
              </button>
            </>
          )}
        </div>
      )}

      {/* 客户列表 */}
      <div className="space-y-4">
        {customers.map((customer) => {
          const isSelected = selectedIds.has(customer.id)
          const statusInfo = statusMap[customer.status] || statusMap.lead
          const intentTag = customer.tags.find((t) => t.dimension === "需求意向")
          const intentValue =
            intentTag?.value === "高意向" ? 80 : intentTag?.value === "中等意向" ? 50 : 30
          const tierInfo = customer.tier ? tierMap[customer.tier] : null

          return (
            <div
              key={customer.id}
              className={`relative rounded-xl transition-all ${
                isSelected
                  ? "ring-1 ring-[var(--primary)]/50"
                  : ""
              }`}
            >
              {/* 选择 Checkbox 浮在卡片左上 */}
              <button
                onClick={() => toggleSelect(customer.id)}
                className="absolute left-3 top-3 z-10 p-1 rounded hover:bg-[var(--primary)]/10 transition-colors"
                aria-label={isSelected ? "取消选择" : "选择此客户"}
              >
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-[var(--primary)]" />
                ) : (
                  <Square className="w-4 h-4 text-[var(--foreground-muted)]" />
                )}
              </button>

              <Link href={`/customers/${customer.id}`}>
                <GlowCard
                  variant={isSelected ? "primary" : "primary"}
                  className="pl-10 pr-4 py-4 hover:scale-[1.01] transition-transform cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <EnergyRing
                        value={intentValue}
                        variant={
                          intentValue > 60 ? "success" : intentValue > 30 ? "warning" : "accent"
                        }
                        size={60}
                        label=""
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-lg">{customer.name}</span>
                          <span
                            className="px-2 py-0.5 rounded text-xs"
                            style={{
                              backgroundColor: `${statusInfo.color}20`,
                              color: statusInfo.color,
                            }}
                          >
                            {statusInfo.label}
                          </span>
                          {tierInfo && (
                            <span
                              className="px-2 py-0.5 rounded text-xs font-medium"
                              style={{
                                backgroundColor: `${tierInfo.color}20`,
                                color: tierInfo.color,
                              }}
                            >
                              {customer.tier}类
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-[var(--foreground-secondary)]">
                          {customer.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {maskPhone(customer.phone)}
                            </span>
                          )}
                          {customer.wechat && (
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-3 h-3" />
                              {customer.wechat}
                            </span>
                          )}
                          <span>{customer._count.audioRecords} 条录音</span>
                        </div>
                        {customer.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {customer.tags.map((tag, idx) => (
                              <TagCapsule
                                key={idx}
                                label={tag.value}
                                variant={tag.dimension === "需求意向" ? "success" : "primary"}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--foreground-secondary)]" />
                  </div>
                </GlowCard>
              </Link>
            </div>
          )
        })}
      </div>

      {/* 成功提示 */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed top-6 right-6 z-50"
          >
            <GlowCard variant="success" className="p-4 min-w-[280px]">
              <div className="flex items-center gap-2 text-[var(--success)]">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">{successMsg}</span>
              </div>
            </GlowCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部浮出批量操作工具栏 */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
          >
            <GlowCard variant="accent" className="px-5 py-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  批量操作 ({selectedCount})
                </span>
                <div className="w-px h-6 bg-[var(--border)]" />

                <button
                  onClick={() => {
                    setActiveAction("mark_done")
                    setError(null)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--success)]/15 text-[var(--success)] hover:bg-[var(--success)]/25 transition-colors text-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  批量完成
                </button>

                <button
                  onClick={() => {
                    setActiveAction("mark_skipped")
                    setError(null)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--warning)]/15 text-[var(--warning)] hover:bg-[var(--warning)]/25 transition-colors text-sm"
                >
                  <SkipForward className="w-4 h-4" />
                  批量跳过
                </button>

                <button
                  onClick={() => {
                    setActiveAction("add_tag")
                    setError(null)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] hover:bg-[var(--accent)]/25 transition-colors text-sm"
                >
                  <Tag className="w-4 h-4" />
                  批量打标签
                </button>

                {isAdmin && (
                  <button
                    onClick={() => {
                      setActiveAction("assign")
                      setError(null)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)]/15 text-[var(--primary)] hover:bg-[var(--primary)]/25 transition-colors text-sm"
                  >
                    <UserCog className="w-4 h-4" />
                    批量分配
                  </button>
                )}

                <button
                  onClick={() => {
                    setActiveAction("generate_scripts")
                    setError(null)
                    setScriptResults(null)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--background)] hover:opacity-90 transition-opacity text-sm font-medium"
                >
                  <Sparkles className="w-4 h-4" />
                  批量生成话术
                </button>

                <div className="w-px h-6 bg-[var(--border)]" />
                <button
                  onClick={clearSelection}
                  className="p-1.5 rounded-lg text-[var(--foreground-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
                  aria-label="关闭"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </GlowCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 操作弹窗 */}
      <AnimatePresence>
        {activeAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] backdrop-blur-sm p-4"
            onClick={() => !submitting && setActiveAction(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg"
            >
              <GlowCard variant="accent" className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-[var(--foreground)]">
                    {activeAction === "mark_skipped" && "批量跳过任务"}
                    {activeAction === "add_tag" && "批量打标签"}
                    {activeAction === "assign" && "批量分配客户"}
                    {activeAction === "generate_scripts" && "批量生成话术"}
                  </h2>
                  <button
                    onClick={() => !submitting && setActiveAction(null)}
                    className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-sm text-[var(--foreground-secondary)] mb-4">
                  将对 <span className="text-[var(--primary)] font-medium">{selectedCount}</span> 个客户执行此操作。
                </p>

                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 flex items-center gap-2 text-[var(--danger)] text-sm">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* 跳过原因 */}
                {activeAction === "mark_skipped" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-[var(--foreground-secondary)] mb-1.5">
                        跳过原因（必填）
                      </label>
                      <textarea
                        value={skipReason}
                        onChange={(e) => setSkipReason(e.target.value)}
                        placeholder="例如：客户近期出差，暂不便打扰"
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--primary)] resize-none"
                      />
                    </div>
                    <BatchActionButtons
                      onCancel={() => setActiveAction(null)}
                      onConfirm={handleBatchSkip}
                      submitting={submitting}
                      confirmText="确认跳过"
                    />
                  </div>
                )}

                {/* 打标签 */}
                {activeAction === "add_tag" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-[var(--foreground-secondary)] mb-1.5">
                          标签维度（键）
                        </label>
                        <input
                          type="text"
                          value={tagKey}
                          onChange={(e) => setTagKey(e.target.value)}
                          placeholder="例如：需求意向"
                          className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--foreground-secondary)] mb-1.5">
                          标签值
                        </label>
                        <input
                          type="text"
                          value={tagValue}
                          onChange={(e) => setTagValue(e.target.value)}
                          placeholder="例如：高意向"
                          className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--primary)]"
                        />
                      </div>
                    </div>
                    <BatchActionButtons
                      onCancel={() => setActiveAction(null)}
                      onConfirm={handleBatchAddTag}
                      submitting={submitting}
                      confirmText="确认打标签"
                    />
                  </div>
                )}

                {/* 分配咨询师 */}
                {activeAction === "assign" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-[var(--foreground-secondary)] mb-1.5">
                        目标咨询师
                      </label>
                      <select
                        value={assignTargetId}
                        onChange={(e) => setAssignTargetId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--primary)]"
                      >
                        <option value="">请选择...</option>
                        {consultants.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {consultants.length === 0 && (
                        <p className="text-xs text-[var(--warning)] mt-2">
                          暂无可分配的咨询师
                        </p>
                      )}
                    </div>
                    <BatchActionButtons
                      onCancel={() => setActiveAction(null)}
                      onConfirm={handleBatchAssign}
                      submitting={submitting}
                      confirmText="确认分配"
                    />
                  </div>
                )}

                {/* 生成话术 */}
                {activeAction === "generate_scripts" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-[var(--foreground-secondary)] mb-1.5">
                        场景/目标（可选）
                      </label>
                      <input
                        type="text"
                        value={scriptScene}
                        onChange={(e) => setScriptScene(e.target.value)}
                        placeholder="例如：节日关怀 / 项目推荐 / 邀约到店"
                        className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--primary)]"
                      />
                      <p className="text-xs text-[var(--foreground-muted)] mt-2">
                        单次最多 10 个客户，话术生成后会经过医疗合规审查
                      </p>
                    </div>
                    <BatchActionButtons
                      onCancel={() => setActiveAction(null)}
                      onConfirm={handleBatchScripts}
                      submitting={submitting}
                      confirmText="生成话术"
                    />
                  </div>
                )}
              </GlowCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 话术结果弹窗 */}
      <AnimatePresence>
        {scriptResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] backdrop-blur-sm p-4"
            onClick={() => setScriptResults(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl max-h-[80vh] overflow-auto"
            >
              <GlowCard variant="primary" className="p-6">
                <div className="flex items-center justify-between mb-5 sticky top-0 bg-[var(--background-card)] backdrop-blur-xl -mx-6 -mt-6 px-6 py-4 border-b border-[var(--border)] z-10">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[var(--accent)]" />
                    <h2 className="text-lg font-bold text-[var(--foreground)]">
                      批量话术生成结果
                    </h2>
                    <span className="text-sm text-[var(--foreground-secondary)]">
                      ({scriptResults.length} 条)
                    </span>
                  </div>
                  <button
                    onClick={() => setScriptResults(null)}
                    className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {scriptResults.map((result) => (
                    <ScriptResultCard key={result.customerId} result={result} />
                  ))}
                </div>

                <div className="flex justify-end mt-5 pt-4 border-t border-[var(--border)]">
                  <button
                    onClick={() => setScriptResults(null)}
                    className="px-4 py-2 rounded-lg bg-[var(--primary)]/20 text-[var(--primary)] hover:bg-[var(--primary)]/30 transition-colors text-sm"
                  >
                    完成
                  </button>
                </div>
              </GlowCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============ 子组件 ============

function BatchActionButtons({
  onCancel,
  onConfirm,
  submitting,
  confirmText,
}: {
  onCancel: () => void
  onConfirm: () => void
  submitting: boolean
  confirmText: string
}) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:border-[var(--foreground-secondary)] transition-colors text-sm disabled:opacity-50"
      >
        取消
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={submitting}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--background)] font-medium hover:opacity-90 transition-opacity text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            执行中...
          </>
        ) : (
          confirmText
        )}
      </button>
    </div>
  )
}

function ScriptResultCard({ result }: { result: ScriptResult }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!result.script) return
    await navigator.clipboard.writeText(result.script)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-4 rounded-lg bg-[var(--background)]/50 border border-[var(--border)]">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <span className="text-sm font-medium text-[var(--foreground)]">
          {result.customerName}
        </span>
        {result.compliancePassed ? (
          <TagCapsule label="合规通过" variant="success" size="sm" />
        ) : (
          <TagCapsule label="合规未通过" variant="danger" size="sm" />
        )}
      </div>

      {result.error ? (
        <p className="text-sm text-[var(--danger)] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {result.error}
        </p>
      ) : result.script ? (
        <>
          {result.subjectLine && (
            <p className="text-xs text-[var(--primary)] mb-2 font-medium">
              {result.subjectLine}
            </p>
          )}
          <p className="text-sm text-[var(--foreground-secondary)] whitespace-pre-wrap leading-relaxed mb-2">
            {result.script}
          </p>
          {result.keyPoints && result.keyPoints.length > 0 && (
            <div className="mt-2 pt-2 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--foreground-muted)] mb-1">关键点：</p>
              <ul className="text-xs text-[var(--foreground-secondary)] space-y-0.5">
                {result.keyPoints.map((p, i) => (
                  <li key={i}>• {p}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-end mt-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--primary)]/10 text-[var(--primary)] rounded hover:bg-[var(--primary)]/20 transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  复制话术
                </>
              )}
            </button>
          </div>
        </>
      ) : null}

      {result.complianceWarnings && result.complianceWarnings.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--warning)] mb-1">合规提醒：</p>
          <ul className="text-xs text-[var(--foreground-secondary)] space-y-0.5">
            {result.complianceWarnings.map((w, i) => (
              <li key={i}>• {w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
