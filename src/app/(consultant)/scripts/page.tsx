"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Plus, Copy, Check, Filter, X, BookOpen, Tag } from "lucide-react"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { apiFetch } from "@/lib/api-fetch"

interface ScriptItem {
  id: string
  title: string
  content: string
  category: string
  tags: string | null
  isOrgLevel: boolean
  useCount: number
  createdAt: string
}

interface CategoryItem {
  key: string
  name: string
  icon: string
  count: number
}

export default function ScriptsLibraryPage() {
  const [scripts, setScripts] = useState<ScriptItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("")
  const [scope, setScope] = useState<"all" | "org" | "personal">("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "opening",
    tags: "",
    isOrgLevel: false,
  })

  const fetchScripts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set("search", searchQuery)
      if (activeCategory) params.set("category", activeCategory)
      if (scope !== "all") params.set("scope", scope)

      const res = await apiFetch(`/api/scripts/library?${params.toString()}`)
      const result = await res.json()
      if (result.success) {
        setScripts(result.data.scripts)
        setCategories(result.data.categories)
      }
    } catch (error) {
      console.error("获取话术库失败:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScripts()
  }, [searchQuery, activeCategory, scope])

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleCreate = async () => {
    try {
      const res = await apiFetch("/api/scripts/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()) : [],
        }),
      })
      const result = await res.json()
      if (result.success) {
        setShowCreateModal(false)
        setFormData({ title: "", content: "", category: "opening", tags: "", isOrgLevel: false })
        fetchScripts()
      }
    } catch (error) {
      console.error("创建话术失败:", error)
    }
  }

  const getCategoryName = (key: string) => {
    return categories.find((c) => c.key === key)?.name || key
  }

  const parseTags = (tagsStr: string | null): string[] => {
    if (!tagsStr) return []
    try {
      return JSON.parse(tagsStr)
    } catch {
      return []
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">话术库</h1>
          <p className="text-[var(--foreground-secondary)] mt-1 text-sm">沉淀优质话术，提高咨询效率</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          新建话术
        </button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-secondary)]" />
          <input
            type="text"
            placeholder="搜索话术标题或内容..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--foreground-secondary)] focus:outline-none focus:border-[var(--primary)]/50"
          />
        </div>
        <div className="flex gap-1 bg-[var(--card)] p-1 rounded-lg border border-[var(--border)]">
          {[
            { key: "all", label: "全部" },
            { key: "org", label: "机构" },
            { key: "personal", label: "个人" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setScope(s.key as typeof scope)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                scope === s.key
                  ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                  : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-3">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(activeCategory === cat.key ? "" : cat.key)}
            className={`p-3 rounded-lg border transition-all text-center ${
              activeCategory === cat.key
                ? "border-[var(--primary)] bg-[var(--primary)]/10"
                : "border-[var(--border)] bg-[var(--card)]/50 hover:border-[var(--primary)]/30"
            }`}
          >
            <div className="text-2xl mb-1">{cat.icon}</div>
            <div className="text-sm font-medium text-[var(--foreground)]">{cat.name}</div>
            <div className="text-xs text-[var(--foreground-secondary)] mt-0.5">{cat.count} 条</div>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : scripts.length === 0 ? (
        <div className="text-center py-16 text-[var(--foreground-secondary)]">
          <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>暂无话术，点击右上角创建第一条话术</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {scripts.map((script, index) => (
            <motion.div
              key={script.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <GlowCard className="h-full">
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-[var(--foreground)]">{script.title}</h3>
                        {script.isOrgLevel && (
                          <span className="px-1.5 py-0.5 text-xs bg-[var(--accent)]/20 text-[var(--accent)] rounded">
                            机构
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded">
                          {getCategoryName(script.category)}
                        </span>
                        <span className="text-xs text-[var(--foreground-secondary)]">
                          使用 {script.useCount} 次
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(script.content, script.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--primary)]/10 text-[var(--primary)] rounded-md hover:bg-[var(--primary)]/20 transition-colors"
                    >
                      {copiedId === script.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          复制
                        </>
                      )}
                    </button>
                  </div>

                  <div className="text-sm text-[var(--foreground-secondary)] line-clamp-3 whitespace-pre-wrap">
                    {script.content}
                  </div>

                  {parseTags(script.tags).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[var(--border)]">
                      <Tag className="w-3.5 h-3.5 text-[var(--foreground-secondary)]" />
                      {parseTags(script.tags).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 bg-[var(--card)] text-[var(--foreground-secondary)] rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </GlowCard>
            </motion.div>
          ))}
        </div>
      )}

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
              className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-6 w-full max-w-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-[var(--foreground)]">新建话术</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 hover:bg-[var(--border)] rounded transition-colors"
                >
                  <X className="w-5 h-5 text-[var(--foreground-secondary)]" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[var(--foreground-secondary)] mb-1.5">标题</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="输入话术标题"
                    className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--foreground-secondary)] focus:outline-none focus:border-[var(--primary)]/50"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[var(--foreground-secondary)] mb-1.5">分类</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]/50"
                  >
                    {categories.map((cat) => (
                      <option key={cat.key} value={cat.key}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-[var(--foreground-secondary)] mb-1.5">话术内容</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="输入话术内容..."
                    rows={6}
                    className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--foreground-secondary)] focus:outline-none focus:border-[var(--primary)]/50 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[var(--foreground-secondary)] mb-1.5">标签（逗号分隔）</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="例如: 玻尿酸, 抗衰, 老客"
                    className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--foreground-secondary)] focus:outline-none focus:border-[var(--primary)]/50"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isOrgLevel"
                    checked={formData.isOrgLevel}
                    onChange={(e) => setFormData({ ...formData, isOrgLevel: e.target.checked })}
                    className="w-4 h-4 rounded border-[var(--border)] bg-[var(--card)] text-[var(--primary)] focus:ring-[var(--primary)]/20"
                  />
                  <label htmlFor="isOrgLevel" className="text-sm text-[var(--foreground-secondary)]">
                    设为机构级话术（全员可见）
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-[var(--foreground-secondary)] hover:bg-[var(--border)] rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!formData.title || !formData.content}
                  className="px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  创建
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
