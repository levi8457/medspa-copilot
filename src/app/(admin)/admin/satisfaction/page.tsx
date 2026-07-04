"use client"

import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Star, AlertTriangle, Filter, CheckCircle, Clock, MessageSquare, Download } from "lucide-react"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { HudPanel } from "@/components/futuristic/HudPanel"
import { TagCapsule } from "@/components/futuristic/TagCapsule"
import { apiFetch } from "@/lib/api-fetch"

const TYPE_MAP: Record<string, { label: string; variant: "primary" | "accent" | "success" }> = {
  post_visit: { label: "术后回访", variant: "primary" },
  service_review: { label: "服务评价", variant: "accent" },
  nps: { label: "NPS调研", variant: "success" },
}

const TYPE_FILTERS = [
  { key: "all", label: "全部" },
  { key: "post_visit", label: "术后回访" },
  { key: "service_review", label: "服务评价" },
  { key: "nps", label: "NPS" },
]

const RATING_FILTERS = [
  { key: "all", label: "全部" },
  { key: "good", label: "好评" },
  { key: "bad", label: "差评" },
]

interface SurveyItem {
  id: string
  customerId: string
  customerName: string
  consultantId: string | null
  type: string
  rating: number | null
  feedback: string | null
  npsScore: number | null
  status: string
  triggeredAt: string
  completedAt: string | null
  createdAt: string
}

interface SatisfactionData {
  stats: {
    total: number
    completed: number
    avgRating: number
    badCount: number
    completionRate: number
  }
  distribution: Array<{ star: number; count: number }>
  list: SurveyItem[]
}

function renderStars(rating: number | null) {
  if (rating == null) {
    return <span className="text-xs text-[var(--foreground-muted)]">未评分</span>
  }
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-3.5 h-3.5 ${
            star <= rating
              ? "fill-[var(--warning)] text-[var(--warning)]"
              : "text-[var(--border)]"
          }`}
        />
      ))}
    </div>
  )
}

export default function SatisfactionPage() {
  const [data, setData] = useState<SatisfactionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [ratingFilter, setRatingFilter] = useState<string>("all")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter !== "all") params.set("type", typeFilter)
      if (ratingFilter !== "all") params.set("rating", ratingFilter)
      const res = await apiFetch(`/api/admin/satisfaction?${params.toString()}`)
      const result = await res.json()
      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      console.error("获取满意度数据失败:", error)
    } finally {
      setLoading(false)
    }
  }, [typeFilter, ratingFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
          <div className="h-64 bg-[var(--card)] animate-pulse rounded-xl" />
        </div>
      </div>
    )
  }

  const stats = data?.stats
  const distribution = data?.distribution || []
  const list = data?.list || []
  const badReviews = list.filter((s) => s.rating != null && s.rating <= 3)
  const maxCount = Math.max(...distribution.map((d) => d.count), 1)

  const starColor = (star: number) => {
    if (star <= 2) return "var(--danger)"
    if (star === 3) return "var(--warning)"
    return "var(--success)"
  }

  const handleExport = () => {
    const params = new URLSearchParams()
    if (typeFilter !== "all") params.set("type", typeFilter)
    if (ratingFilter === "good") params.set("minRating", "4")
    if (ratingFilter === "bad") params.set("maxRating", "3")
    window.location.href = `/api/export/satisfaction?${params.toString()}`
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">满意度调研管理</h1>
            <p className="text-[var(--foreground-secondary)] mt-1">
              监控客户满意度，及时预警差评风险
            </p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] rounded-lg font-medium hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <HudPanel
            label="平均评分"
            value={stats?.avgRating || 0}
            unit="/ 5"
            icon={<Star />}
            variant="primary"
          />
          <HudPanel
            label="调研总数"
            value={stats?.total || 0}
            icon={<MessageSquare />}
            variant="accent"
          />
          <HudPanel
            label="差评预警"
            value={stats?.badCount || 0}
            icon={<AlertTriangle />}
            variant={stats?.badCount ? "danger" : "primary"}
          />
          <HudPanel
            label="完成率"
            value={stats?.completionRate || 0}
            unit="%"
            icon={<CheckCircle />}
            variant="success"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <GlowCard className="lg:col-span-2 p-6">
            <h2 className="text-lg font-medium text-[var(--foreground)] mb-6">评分分布</h2>
            <div className="flex items-end justify-between h-[240px] gap-6 px-4">
              {distribution.map((item, index) => (
                <motion.div
                  key={item.star}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{
                    height: `${(item.count / maxCount) * 100}%`,
                    opacity: 1,
                  }}
                  transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
                  className="flex-1 flex flex-col items-center justify-end relative group h-full"
                >
                  <span className="text-sm font-mono font-bold mb-2 text-[var(--foreground)]">
                    {item.count}
                  </span>
                  <div
                    className="w-full rounded-t-lg transition-all group-hover:opacity-80"
                    style={{
                      height: `${Math.max((item.count / maxCount) * 100, item.count > 0 ? 4 : 0)}%`,
                      backgroundColor: starColor(item.star),
                      minHeight: item.count > 0 ? "8px" : "0",
                    }}
                  />
                  <div className="flex items-center gap-1 mt-3">
                    <span className="text-xs text-[var(--foreground-secondary)]">{item.star}</span>
                    <Star className="w-3 h-3 fill-[var(--warning)] text-[var(--warning)]" />
                  </div>
                </motion.div>
              ))}
            </div>
          </GlowCard>

          <GlowCard variant="danger" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-[var(--foreground)]">差评预警</h2>
              <span className="flex items-center gap-1 text-sm text-[var(--danger)]">
                <AlertTriangle className="w-4 h-4" />
                {badReviews.length} 条
              </span>
            </div>
            <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
              {badReviews.length === 0 ? (
                <div className="text-center text-[var(--foreground-secondary)] py-8">
                  <CheckCircle className="w-10 h-10 mx-auto mb-3 text-[var(--success)]" />
                  <p className="text-sm">暂无差评预警</p>
                </div>
              ) : (
                badReviews.slice(0, 8).map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className="p-3 rounded-lg bg-[var(--danger)]/5 border border-[var(--danger)]/20 hover:border-[var(--danger)]/40 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-[var(--foreground)]">
                        {item.customerName}
                      </span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3 h-3 ${
                              s <= (item.rating || 0)
                                ? "fill-[var(--danger)] text-[var(--danger)]"
                                : "text-[var(--border)]"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-[var(--foreground-secondary)] line-clamp-2">
                      {item.feedback || "无反馈内容"}
                    </p>
                  </motion.div>
                ))
              )}
            </div>
          </GlowCard>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--foreground-secondary)]" />
            <span className="text-sm text-[var(--foreground-secondary)]">类型</span>
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  typeFilter === f.key
                    ? "bg-[var(--primary)] text-[var(--background)]"
                    : "bg-[var(--card)] text-[var(--foreground-secondary)] hover:bg-[var(--border)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--foreground-secondary)]">评分</span>
            {RATING_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setRatingFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  ratingFilter === f.key
                    ? f.key === "bad"
                      ? "bg-[var(--danger)] text-[var(--background)]"
                      : f.key === "good"
                      ? "bg-[var(--success)] text-[var(--background)]"
                      : "bg-[var(--primary)] text-[var(--background)]"
                    : "bg-[var(--card)] text-[var(--foreground-secondary)] hover:bg-[var(--border)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-[var(--foreground)]">
              调研列表
              <span className="ml-2 text-sm font-normal text-[var(--foreground-secondary)]">
                共 {list.length} 条
              </span>
            </h2>
          </div>

          <AnimatePresence>
            {list.map((item, index) => {
              const typeInfo = TYPE_MAP[item.type] || { label: item.type, variant: "primary" as const }
              const isBad = item.rating != null && item.rating <= 3
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: Math.min(index * 0.05, 0.4) }}
                >
                  <GlowCard
                    variant={isBad ? "danger" : "primary"}
                    className="p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="font-medium text-[var(--foreground)]">
                            {item.customerName}
                          </span>
                          <TagCapsule
                            label={typeInfo.label}
                            variant={typeInfo.variant}
                            size="sm"
                          />
                          {item.status === "completed" ? (
                            <span className="flex items-center gap-1 text-xs text-[var(--success)]">
                              <CheckCircle className="w-3 h-3" />
                              已完成
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-[var(--warning)]">
                              <Clock className="w-3 h-3" />
                              待完成
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mb-2">
                          {renderStars(item.rating)}
                          {item.type === "nps" && item.npsScore != null && (
                            <span className="text-xs font-mono text-[var(--accent)]">
                              NPS: {item.npsScore}/10
                            </span>
                          )}
                        </div>
                        {item.feedback && (
                          <p className="text-sm text-[var(--foreground-secondary)] line-clamp-2">
                            {item.feedback}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-[var(--foreground-secondary)]">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(item.createdAt).toLocaleString("zh-CN")}
                          </span>
                        </div>
                      </div>
                      {isBad && (
                        <div className="flex items-center gap-1 px-2.5 py-1 bg-[var(--danger)]/20 text-[var(--danger)] rounded-lg text-xs font-medium shrink-0">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          差评
                        </div>
                      )}
                    </div>
                  </GlowCard>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {list.length === 0 && (
            <GlowCard className="p-12 text-center">
              <MessageSquare className="w-12 h-12 text-[var(--foreground-muted)] mx-auto mb-4" />
              <p className="text-[var(--foreground)] font-medium mb-1">暂无调研数据</p>
              <p className="text-sm text-[var(--foreground-secondary)]">
                调整筛选条件或创建新的满意度调研
              </p>
            </GlowCard>
          )}
        </div>
      </div>
    </div>
  )
}
