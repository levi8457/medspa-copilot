"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Sparkles, Copy, Check, TrendingUp, Star, RefreshCw, ChevronRight } from "lucide-react"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { EnergyRing } from "@/components/futuristic/EnergyRing"
import Link from "next/link"
import { apiFetch } from "@/lib/api-fetch"

interface Recommendation {
  id: string
  customerId: string
  projectId: string
  score: number
  reason: string
  script: string | null
  conversionProb: number | null
  status: string
  customer: {
    id: string
    name: string
    status: string
    tier: string | null
  }
  project: {
    id: string
    name: string
    category: string
    priceMin: number | null
    priceMax: number | null
    description: string | null
  }
}

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchRecommendations = async () => {
    setLoading(true)
    try {
      const res = await apiFetch("/api/recommendations")
      const result = await res.json()
      if (result.success) {
        setRecommendations(result.data)
      }
    } catch (error) {
      console.error("获取推荐失败:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecommendations()
  }, [])

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleMarkAdopted = async (id: string) => {
    try {
      const res = await apiFetch(`/api/recommendations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "adopted" }),
      })
      if (res.ok) {
        setRecommendations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: "adopted" } : r))
        )
      }
    } catch (error) {
      console.error("更新状态失败:", error)
    }
  }

  const getScoreColor = (score: number): "success" | "primary" | "warning" | "accent" => {
    if (score >= 0.7) return "success"
    if (score >= 0.5) return "primary"
    if (score >= 0.3) return "warning"
    return "accent"
  }

  const tierMap: Record<string, { label: string; color: string }> = {
    A: { label: "A类", color: "var(--success)" },
    B: { label: "B类", color: "var(--primary)" },
    C: { label: "C类", color: "var(--warning)" },
    D: { label: "D类", color: "var(--foreground-secondary)" },
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <div className="w-10 h-10 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[var(--accent)]" />
            智能升单推荐
          </h1>
          <p className="text-[var(--foreground-secondary)] mt-1 text-sm">
            AI 基于客户标签智能推荐升单项目
          </p>
        </div>
        <button
          onClick={fetchRecommendations}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)]/20 text-[var(--accent)] rounded-lg hover:bg-[var(--accent)]/30 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          刷新推荐
        </button>
      </div>

      {recommendations.length === 0 ? (
        <GlowCard variant="accent" className="p-12 text-center">
          <Sparkles className="w-16 h-16 mx-auto mb-4 text-[var(--accent)] opacity-50" />
          <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">暂无推荐</h3>
          <p className="text-[var(--foreground-secondary)] text-sm mb-4">
            上传客户录音后，AI 将自动分析并生成升单推荐
          </p>
        </GlowCard>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec, index) => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <GlowCard variant={getScoreColor(rec.score)}>
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <EnergyRing
                      value={rec.score * 100}
                      variant={getScoreColor(rec.score)}
                      size={80}
                      strokeWidth={8}
                      label="推荐度"
                    />

                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-medium text-[var(--foreground)]">
                              {rec.project.name}
                            </h3>
                            <span className="px-2 py-0.5 text-xs bg-[var(--primary)]/10 text-[var(--primary)] rounded">
                              {rec.project.category}
                            </span>
                            {rec.status === "adopted" && (
                              <span className="px-2 py-0.5 text-xs bg-[var(--success)]/20 text-[var(--success)] rounded">
                                已采纳
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-[var(--foreground-secondary)]">
                            <Link
                              href={`/customers/${rec.customer.id}`}
                              className="flex items-center gap-1 hover:text-[var(--primary)] transition-colors"
                            >
                              {rec.customer.name}
                              <ChevronRight className="w-3 h-3" />
                            </Link>
                            {rec.customer.tier && (
                              <span style={{ color: tierMap[rec.customer.tier]?.color }}>
                                {tierMap[rec.customer.tier]?.label}
                              </span>
                            )}
                            {rec.conversionProb !== null && (
                              <span className="flex items-center gap-1">
                                <TrendingUp className="w-3.5 h-3.5 text-[var(--success)]" />
                                预计转化 {(rec.conversionProb * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </div>

                        {rec.project.priceMin !== null && (
                          <div className="text-right">
                            <div className="text-lg font-bold text-[var(--success)]">
                              ¥{rec.project.priceMin.toLocaleString()}
                              {rec.project.priceMax !== null &&
                                rec.project.priceMax !== rec.project.priceMin && (
                                  <span className="text-sm font-normal text-[var(--foreground-secondary)]">
                                    ~{rec.project.priceMax.toLocaleString()}
                                  </span>
                                )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 p-3 bg-[var(--card)]/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="w-4 h-4 text-[var(--warning)]" />
                          <span className="text-sm font-medium text-[var(--foreground)]">
                            推荐理由
                          </span>
                        </div>
                        <p className="text-sm text-[var(--foreground-secondary)]">{rec.reason}</p>
                      </div>

                      {rec.script && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-[var(--foreground)]">
                              推荐话术
                            </span>
                            <button
                              onClick={() => handleCopy(rec.script!, rec.id)}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--primary)]/10 text-[var(--primary)] rounded hover:bg-[var(--primary)]/20 transition-colors"
                            >
                              {copiedId === rec.id ? (
                                <>
                                  <Check className="w-3 h-3" />
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
                          <p className="text-sm text-[var(--foreground-secondary)] whitespace-pre-wrap line-clamp-2">
                            {rec.script}
                          </p>
                        </div>
                      )}

                      {rec.status === "pending" && (
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => handleMarkAdopted(rec.id)}
                            className="flex-1 px-4 py-2 bg-[var(--success)]/20 text-[var(--success)] rounded-lg hover:bg-[var(--success)]/30 transition-colors text-sm font-medium"
                          >
                            标记已采纳
                          </button>
                          <button
                            className="px-4 py-2 bg-[var(--danger)]/10 text-[var(--danger)] rounded-lg hover:bg-[var(--danger)]/20 transition-colors text-sm"
                          >
                            不感兴趣
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </GlowCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
