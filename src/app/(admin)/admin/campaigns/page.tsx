"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus, Calendar, Users, CheckCircle, Activity, X,
} from "lucide-react"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { HudPanel } from "@/components/futuristic/HudPanel"
import { apiFetch } from "@/lib/api-fetch"

const typeMap: Record<string, { label: string; icon: string; color: string }> = {
  coupon: { label: "优惠券", icon: "🎫", color: "var(--primary)" },
  experience: { label: "体验项目", icon: "🎁", color: "var(--accent)" },
  referral: { label: "老带新", icon: "🤝", color: "var(--success)" },
  festival: { label: "节日活动", icon: "🎉", color: "var(--warning)" },
}

const statusMap: Record<string, { label: string; color: string }> = {
  draft: { label: "草稿", color: "var(--foreground-secondary)" },
  active: { label: "进行中", color: "var(--success)" },
  paused: { label: "已暂停", color: "var(--warning)" },
  ended: { label: "已结束", color: "var(--danger)" },
}

const typeFilters = [
  { value: "", label: "全部" },
  { value: "coupon", label: "优惠券" },
  { value: "experience", label: "体验项目" },
  { value: "referral", label: "老带新" },
  { value: "festival", label: "节日活动" },
]

const statusFilters = [
  { value: "", label: "全部" },
  { value: "draft", label: "草稿" },
  { value: "active", label: "进行中" },
  { value: "paused", label: "已暂停" },
  { value: "ended", label: "已结束" },
]

interface Campaign {
  id: string
  name: string
  type: string
  status: string
  config: string | null
  startDate: string
  endDate: string
  budget: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  participants: number
  used: number
  verificationRate: number
}

interface Stats {
  total: number
  active: number
  totalParticipants: number
  verificationRate: number
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, totalParticipants: 0, verificationRate: 0 })
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    type: "coupon",
    startDate: "",
    endDate: "",
    budget: "",
    config: "",
  })

  const fetchCampaigns = async () => {
    try {
      const params = new URLSearchParams()
      if (typeFilter) params.set("type", typeFilter)
      if (statusFilter) params.set("status", statusFilter)

      const res = await apiFetch(`/api/admin/campaigns?${params}`)
      const result = await res.json()
      if (result.success) {
        setCampaigns(result.data.campaigns)
        setStats(result.data.stats)
      }
    } catch (error) {
      console.error("获取营销活动失败:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCampaigns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, statusFilter])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.startDate || !formData.endDate) return

    setSubmitting(true)
    try {
      let config = undefined
      if (formData.config.trim()) {
        try {
          config = JSON.parse(formData.config)
        } catch {
          alert("活动配置 JSON 格式错误")
          setSubmitting(false)
          return
        }
      }

      const res = await apiFetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          startDate: formData.startDate,
          endDate: formData.endDate,
          budget: formData.budget ? Number(formData.budget) : undefined,
          config,
        }),
      })
      const result = await res.json()
      if (result.success) {
        setShowCreateModal(false)
        setFormData({ name: "", type: "coupon", startDate: "", endDate: "", budget: "", config: "" })
        fetchCampaigns()
      } else {
        alert(result.error?.message || "创建失败")
      }
    } catch (error) {
      console.error("创建营销活动失败:", error)
      alert("创建营销活动失败")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确认删除此营销活动？")) return
    try {
      const res = await apiFetch(`/api/admin/campaigns/${id}`, { method: "DELETE" })
      const result = await res.json()
      if (result.success) {
        fetchCampaigns()
      } else {
        alert(result.error?.message || "删除失败")
      }
    } catch (error) {
      console.error("删除营销活动失败:", error)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }
  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-8 w-48 bg-[var(--card)] animate-pulse rounded" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-[var(--card)] animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">营销活动管理</h1>
            <p className="text-[var(--foreground-secondary)] mt-1">管理机构营销活动，追踪参与与核销数据</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            新建活动
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <HudPanel label="活动总数" value={stats.total} icon={<Activity />} variant="primary" />
          <HudPanel label="进行中" value={stats.active} icon={<Calendar />} variant="success" />
          <HudPanel label="总参与人数" value={stats.totalParticipants} icon={<Users />} variant="accent" />
          <HudPanel label="核销率" value={stats.verificationRate} unit="%" icon={<CheckCircle />} variant="warning" />
        </div>

        <GlowCard className="p-6">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--foreground-secondary)]">类型：</span>
              <div className="flex gap-1">
                {typeFilters.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setTypeFilter(f.value)}
                    className={`px-3 py-1 rounded-lg text-sm transition-all ${
                      typeFilter === f.value
                        ? "bg-[var(--primary)] text-[var(--background)]"
                        : "bg-[var(--background)]/50 text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--foreground-secondary)]">状态：</span>
              <div className="flex gap-1">
                {statusFilters.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setStatusFilter(f.value)}
                    className={`px-3 py-1 rounded-lg text-sm transition-all ${
                      statusFilter === f.value
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--background)]/50 text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>          <div className="space-y-3">
            {campaigns.length === 0 ? (
              <div className="p-8 text-center text-[var(--foreground-secondary)]">
                暂无营销活动数据
              </div>
            ) : (
              campaigns.map((campaign, idx) => {
                const typeInfo = typeMap[campaign.type] || typeMap.coupon
                const statusInfo = statusMap[campaign.status] || statusMap.draft
                return (
                  <motion.div
                    key={campaign.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                    className="p-4 rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/50 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-lg">{typeInfo.icon}</span>
                          <span className="font-medium text-[var(--foreground)] truncate">{campaign.name}</span>
                          <span
                            className="px-2 py-0.5 rounded text-xs"
                            style={{ backgroundColor: `${typeInfo.color}20`, color: typeInfo.color }}
                          >
                            {typeInfo.label}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded text-xs"
                            style={{ backgroundColor: `${statusInfo.color}20`, color: statusInfo.color }}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-[var(--foreground-secondary)] mb-2 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(campaign.startDate)} ~ {formatDate(campaign.endDate)}
                          </span>
                          {campaign.budget !== null && (
                            <span className="flex items-center gap-1">
                              预算：¥{campaign.budget.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1 text-[var(--foreground-secondary)]">
                            <Users className="w-3 h-3" />
                            参与 {campaign.participants}
                          </span>
                          <span className="flex items-center gap-1 text-[var(--foreground-secondary)]">
                            <CheckCircle className="w-3 h-3" />
                            核销 {campaign.used}
                          </span>
                          <span className="flex items-center gap-1 text-[var(--primary)]">
                            核销率 {campaign.verificationRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(campaign.id)}
                        className="text-xs px-3 py-1 rounded-lg border border-[var(--danger)]/30 text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors shrink-0"
                      >
                        删除
                      </button>
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </GlowCard>
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setShowCreateModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-medium text-[var(--foreground)]">新建营销活动</h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-1 hover:bg-[var(--border)] rounded transition-colors"
                  >
                    <X className="w-5 h-5 text-[var(--foreground-secondary)]" />
                  </button>
                </div>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-sm text-[var(--foreground-secondary)] mb-1">活动名称 *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="请输入活动名称"
                      required
                      className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]/50 focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--foreground-secondary)] mb-1">活动类型 *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                    >
                      <option value="coupon">🎫 优惠券</option>
                      <option value="experience">🎁 体验项目</option>
                      <option value="referral">🤝 老带新</option>
                      <option value="festival">🎉 节日活动</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-[var(--foreground-secondary)] mb-1">开始时间 *</label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        required
                        className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--foreground-secondary)] mb-1">结束时间 *</label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        required
                        className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--foreground-secondary)] mb-1">预算（元）</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      placeholder="选填"
                      className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]/50 focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>                  <div>
                    <label className="block text-sm text-[var(--foreground-secondary)] mb-1">活动配置（JSON）</label>
                    <textarea
                      value={formData.config}
                      onChange={(e) => setFormData({ ...formData, config: e.target.value })}
                      placeholder='选填，如 {"discount": 0.8}'
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]/50 focus:outline-none focus:border-[var(--primary)] font-mono text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 text-[var(--foreground-secondary)] hover:bg-[var(--border)] rounded-lg transition-colors"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {submitting ? "创建中..." : "确认创建"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}