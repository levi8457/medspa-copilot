"use client"

import { useCallback, useEffect, useState } from "react"
import { GlowCard } from "@/components/futuristic/GlowCard"
import {
  AlertCircle,
  Clock,
  Cloud,
  Edit3,
  HardDrive,
  Mic,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react"

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
  createdAt: string
  updatedAt: string
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string }
}

interface PlanFormValues {
  name: string
  description: string
  maxSeats: number
  maxRecordingHours: number
  maxAiCalls: number
  maxStorage: number
  priceMonthly: number
  priceYearly: number
  trialDays: number
  sortOrder: number
}

const emptyForm: PlanFormValues = {
  name: "",
  description: "",
  maxSeats: 5,
  maxRecordingHours: 10,
  maxAiCalls: 100,
  maxStorage: 5,
  priceMonthly: 0,
  priceYearly: 0,
  trialDays: 14,
  sortOrder: 0,
}

const inputClass =
  "w-full px-4 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"

const labelClass =
  "block text-sm font-medium text-[var(--foreground-secondary)] mb-2"

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/platform/plans")
      const json: ApiResponse<Plan[]> = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "获取套餐列表失败")
      }
      setPlans(json.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取套餐列表失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const handleDelete = async (plan: Plan) => {
    if (!window.confirm(`确定要删除套餐「${plan.name}」吗？（将置为停用状态）`)) {
      return
    }
    try {
      const res = await fetch(`/api/platform/plans/${plan.id}`, {
        method: "DELETE",
      })
      const json: ApiResponse<{ id: string }> = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "删除套餐失败")
      }
      await fetchPlans()
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除套餐失败")
    }
  }

  const handleEditClick = (plan: Plan) => {
    setEditingPlan(plan)
    setShowForm(true)
  }

  const handleCreateClick = () => {
    setEditingPlan(null)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingPlan(null)
  }

  const handleFormSubmit = async (values: PlanFormValues) => {
    const isEditing = !!editingPlan
    const url = isEditing
      ? `/api/platform/plans/${editingPlan!.id}`
      : "/api/platform/plans"
    const method = isEditing ? "PATCH" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        description: values.description.trim() || undefined,
      }),
    })
    const json: ApiResponse<Plan> = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || (isEditing ? "更新套餐失败" : "创建套餐失败"))
    }
    await fetchPlans()
    handleFormClose()
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">套餐管理</h1>
            <p className="text-[var(--foreground-secondary)] mt-1">
              管理平台所有订阅套餐及配额
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchPlans}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              刷新
            </button>
            <button
              onClick={handleCreateClick}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              新建套餐
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[var(--danger)] flex-shrink-0" />
            <p className="text-sm text-[var(--danger)]">{error}</p>
          </div>
        )}

        {showForm && (
          <PlanForm
            initial={editingPlan ? toFormValues(editingPlan) : emptyForm}
            isEditing={!!editingPlan}
            onSubmit={handleFormSubmit}
            onClose={handleFormClose}
            onError={(msg) => setError(msg)}
          />
        )}

        {loading ? (
          <div className="py-16 text-center text-[var(--foreground-secondary)]">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
            加载中...
          </div>
        ) : plans.length === 0 ? (
          <GlowCard variant="primary" className="p-12 text-center">
            <Plus className="w-12 h-12 mx-auto mb-3 text-[var(--foreground-secondary)]/50" />
            <p className="text-[var(--foreground-secondary)]">暂无套餐数据，点击「新建套餐」开始创建</p>
          </GlowCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onEdit={() => handleEditClick(plan)}
                onDelete={() => handleDelete(plan)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function toFormValues(plan: Plan): PlanFormValues {
  return {
    name: plan.name,
    description: plan.description || "",
    maxSeats: plan.maxSeats,
    maxRecordingHours: plan.maxRecordingHours,
    maxAiCalls: plan.maxAiCalls,
    maxStorage: plan.maxStorage,
    priceMonthly: plan.priceMonthly,
    priceYearly: plan.priceYearly,
    trialDays: plan.trialDays,
    sortOrder: plan.sortOrder,
  }
}

function PlanCard({
  plan,
  onEdit,
  onDelete,
}: {
  plan: Plan
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <GlowCard variant={plan.isActive ? "primary" : "warning"} className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-[var(--foreground)] truncate">
              {plan.name}
            </h3>
            <span
              className="px-2 py-0.5 rounded text-xs flex-shrink-0"
              style={{
                backgroundColor: plan.isActive
                  ? "color-mix(in srgb, var(--success) 20%, transparent)"
                  : "color-mix(in srgb, var(--warning) 20%, transparent)",
                color: plan.isActive ? "var(--success)" : "var(--warning)",
              }}
            >
              {plan.isActive ? "启用" : "停用"}
            </span>
          </div>
          {plan.description ? (
            <p className="text-sm text-[var(--foreground-secondary)] mt-1 line-clamp-2">
              {plan.description}
            </p>
          ) : (
            <p className="text-sm text-[var(--foreground-secondary)]/60 mt-1 italic">
              暂无描述
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 py-3 border-y border-[var(--border)]">
        <div>
          <span className="text-xs text-[var(--foreground-secondary)]">月付价格</span>
          <p className="font-mono text-lg font-bold text-[var(--primary)]">
            ¥{plan.priceMonthly.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <span className="text-xs text-[var(--foreground-secondary)]">年付价格</span>
          <p className="font-mono text-lg font-bold text-[var(--accent)]">
            ¥{plan.priceYearly.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <FeatureItem icon={<Users className="w-4 h-4" />} label="咨询师席位" value={`${plan.maxSeats} 人`} />
        <FeatureItem icon={<Mic className="w-4 h-4" />} label="录音时长" value={`${plan.maxRecordingHours} 小时`} />
        <FeatureItem icon={<Zap className="w-4 h-4" />} label="AI 调用" value={`${plan.maxAiCalls} 次`} />
        <FeatureItem icon={<HardDrive className="w-4 h-4" />} label="存储空间" value={`${plan.maxStorage} GB`} />
        <FeatureItem icon={<Clock className="w-4 h-4" />} label="试用天数" value={`${plan.trialDays} 天`} />
        <FeatureItem icon={<Cloud className="w-4 h-4" />} label="排序权重" value={`${plan.sortOrder}`} />
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors text-sm flex-1 justify-center"
        >
          <Edit3 className="w-4 h-4" />
          编辑
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20 transition-colors text-sm flex-1 justify-center"
        >
          <Trash2 className="w-4 h-4" />
          删除
        </button>
      </div>
    </GlowCard>
  )
}

function FeatureItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[var(--foreground-muted)]">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-[var(--foreground-secondary)]">{label}</p>
        <p className="font-mono text-sm text-[var(--foreground)] truncate">{value}</p>
      </div>
    </div>
  )
}

function PlanForm({
  initial,
  isEditing,
  onSubmit,
  onClose,
  onError,
}: {
  initial: PlanFormValues
  isEditing: boolean
  onSubmit: (values: PlanFormValues) => Promise<void>
  onClose: () => void
  onError: (msg: string) => void
}) {
  const [form, setForm] = useState<PlanFormValues>(initial)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      onError("请填写套餐名称")
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

  const numField = (
    key: keyof PlanFormValues,
    label: string,
    icon: React.ReactNode,
    min = 0,
  ) => (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]">
          {icon}
        </span>
        <input
          type="number"
          min={min}
          value={form[key] as number}
          onChange={(e) =>
            setForm({ ...form, [key]: Number(e.target.value) })
          }
          className={`${inputClass} pl-9 font-mono`}
        />
      </div>
    </div>
  )

  return (
    <GlowCard variant="accent" intensity="high" className="p-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
            {isEditing ? <Edit3 className="w-5 h-5 text-[var(--primary)]" /> : <Plus className="w-5 h-5 text-[var(--primary)]" />}
            {isEditing ? "编辑套餐" : "新建套餐"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>套餐名称 *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="如：基础版 / 专业版 / 旗舰版"
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>套餐描述</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="套餐适用场景或功能说明"
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>

          {numField("maxSeats", "咨询师席位 *", <Users className="w-4 h-4" />, 1)}
          {numField("maxRecordingHours", "录音时长（小时）", <Mic className="w-4 h-4" />)}
          {numField("maxAiCalls", "AI 调用次数", <Zap className="w-4 h-4" />)}
          {numField("maxStorage", "存储空间（GB）", <HardDrive className="w-4 h-4" />)}
          {numField("trialDays", "试用天数", <Clock className="w-4 h-4" />)}
          {numField("priceMonthly", "月付价格（¥）", <span className="text-xs font-bold">¥</span>)}
          {numField("priceYearly", "年付价格（¥）", <span className="text-xs font-bold">¥</span>)}
          {numField("sortOrder", "排序权重", <span className="text-xs">#</span>)}
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
              <Save className="w-4 h-4" />
            )}
            {saving ? "保存中..." : isEditing ? "保存修改" : "创建套餐"}
          </button>
        </div>
      </form>
    </GlowCard>
  )
}
