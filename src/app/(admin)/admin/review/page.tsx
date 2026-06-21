"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, XCircle, Filter, Eye } from "lucide-react"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { TagCapsule } from "@/components/futuristic/TagCapsule"

interface ReviewItem {
  id: string
  type: "sop" | "tag" | "strategy"
  title: string
  content: string
  creator: string
  status: string
  createdAt: string
}

export default function ReviewCenterPage() {
  const [items, setItems] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null)
  const [reviewComment, setReviewComment] = useState("")

  const fetchReviewItems = async () => {
    try {
      const res = await fetch("/api/admin/review")
      const result = await res.json()
      if (result.success) {
        setItems(result.data)
      }
    } catch (error) {
      console.error("获取审核列表失败:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviewItems()
  }, [])

  const handleReview = async (id: string, action: "approve" | "reject") => {
    try {
      await fetch(`/api/review/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          comment: reviewComment,
        }),
      })
      setSelectedItem(null)
      setReviewComment("")
      fetchReviewItems()
    } catch (error) {
      console.error("审核操作失败:", error)
    }
  }

  const filteredItems = items.filter((item) => {
    if (typeFilter === "all") return true
    return item.type === typeFilter
  })

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-8 w-48 bg-[var(--card)] animate-pulse rounded" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-[var(--card)] animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            审核中心
          </h1>
          <p className="text-[var(--foreground-secondary)] mt-1">
            审核 SOP、标签和策略
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--foreground-secondary)]" />
          {["all", "sop", "tag", "strategy"].map((filter) => (
            <button
              key={filter}
              onClick={() => setTypeFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === filter
                  ? "bg-[var(--primary)] text-[var(--background)]"
                  : "bg-[var(--card)] text-[var(--foreground-secondary)] hover:bg-[var(--border)]"
              }`}
            >
              {filter === "all"
                ? "全部"
                : filter === "sop"
                ? "SOP"
                : filter === "tag"
                ? "标签"
                : "策略"}
            </button>
          ))}
        </div>

        {/* Review List */}
        <div className="space-y-4">
          <AnimatePresence>
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlowCard
                  className="p-4 cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <TagCapsule
                          label={item.type === "sop" ? "SOP" : item.type === "tag" ? "标签" : "策略"}
                          variant={
                            item.type === "sop"
                              ? "primary"
                              : item.type === "tag"
                              ? "accent"
                              : "success"
                          }
                          size="sm"
                        />
                        <span className="font-medium text-[var(--foreground)]">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--foreground-secondary)] line-clamp-2">
                        {item.content}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-[var(--foreground-secondary)]">
                        <span>创建者：{item.creator}</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-[var(--card)] text-[var(--foreground-secondary)] rounded-lg text-sm">
                      <Eye className="w-4 h-4" />
                      审核
                    </div>
                  </div>
                </GlowCard>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredItems.length === 0 && (
            <GlowCard className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-[var(--success)] mx-auto mb-4" />
              <p className="text-[var(--foreground)] font-medium">
                暂无待审核内容
              </p>
            </GlowCard>
          )}
        </div>

        {/* Review Modal */}
        <AnimatePresence>
          {selectedItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setSelectedItem(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-6 w-full max-w-2xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">
                  审核详情
                </h2>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-[var(--foreground-secondary)]">类型</p>
                    <p className="font-medium text-[var(--foreground)]">
                      {selectedItem.type === "sop"
                        ? "SOP 模板"
                        : selectedItem.type === "tag"
                        ? "标签抽检"
                        : "跟进策略"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-[var(--foreground-secondary)]">标题</p>
                    <p className="font-medium text-[var(--foreground)]">{selectedItem.title}</p>
                  </div>

                  <div>
                    <p className="text-sm text-[var(--foreground-secondary)]">内容</p>
                    <p className="text-[var(--foreground)] whitespace-pre-wrap">
                      {selectedItem.content}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-[var(--foreground-secondary)] mb-1">
                      审核意见
                    </label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] h-24 resize-none"
                      placeholder="请输入审核意见..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="px-4 py-2 text-[var(--foreground-secondary)] hover:bg-[var(--border)] rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => handleReview(selectedItem.id, "reject")}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--danger)]/20 text-[var(--danger)] rounded-lg font-medium hover:bg-[var(--danger)]/30 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    驳回
                  </button>
                  <button
                    onClick={() => handleReview(selectedItem.id, "approve")}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--success)]/20 text-[var(--success)] rounded-lg font-medium hover:bg-[var(--success)]/30 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    通过
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