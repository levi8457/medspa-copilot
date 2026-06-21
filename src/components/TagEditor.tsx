"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { TagCapsule } from "@/components/futuristic/TagCapsule"
import { Pencil, Plus, Trash2, X, Check, FileAudio, Quote } from "lucide-react"

interface Tag {
  id: string
  dimension: string
  value: string
  sourceText?: string
  audioRecordId?: string
  isManuallyModified?: boolean
}

interface TagEditorProps {
  customerId: string
  tags: Tag[]
  onTagsChange: (tags: Tag[]) => void
  onViewTranscript?: (audioRecordId: string, highlight?: string) => void
}

export function TagEditor({ customerId, tags, onTagsChange, onViewTranscript }: TagEditorProps) {
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [editValue, setEditValue] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [newDimension, setNewDimension] = useState("")
  const [newValue, setNewValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [hoveredTag, setHoveredTag] = useState<string | null>(null)

  const handleUpdate = async (tag: Tag) => {
    if (!editValue.trim() || editValue === tag.value) {
      setEditingTag(null)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/customers/${customerId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId: tag.id, dimension: tag.dimension, value: editValue, action: "update" }),
      })
      const result = await res.json()
      if (result.success) {
        onTagsChange(tags.map((t) => (t.id === tag.id ? { ...t, value: editValue, isManuallyModified: true } : t)))
      }
    } catch (e) {
      console.error("更新标签失败:", e)
    }
    setLoading(false)
    setEditingTag(null)
  }

  const handleDelete = async (tag: Tag) => {
    if (!confirm(`确定删除标签「${tag.dimension}: ${tag.value}」？`)) return

    setLoading(true)
    try {
      const res = await fetch(`/api/customers/${customerId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId: tag.id, dimension: tag.dimension, value: tag.value, action: "delete" }),
      })
      const result = await res.json()
      if (result.success) {
        onTagsChange(tags.filter((t) => t.id !== tag.id))
      }
    } catch (e) {
      console.error("删除标签失败:", e)
    }
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!newDimension.trim() || !newValue.trim()) return

    setLoading(true)
    try {
      const res = await fetch(`/api/customers/${customerId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dimension: newDimension, value: newValue, action: "create" }),
      })
      const result = await res.json()
      if (result.success) {
        onTagsChange([...tags, result.data])
        setNewDimension("")
        setNewValue("")
        setIsAdding(false)
      }
    } catch (e) {
      console.error("添加标签失败:", e)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--foreground-secondary)]">客户标签</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 text-xs text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors"
        >
          <Plus className="w-3 h-3" />
          添加
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="维度"
              value={newDimension}
              onChange={(e) => setNewDimension(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded bg-[var(--background)]/50 border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]/50 focus:outline-none focus:border-[var(--primary)]"
            />
            <input
              type="text"
              placeholder="值"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded bg-[var(--background)]/50 border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]/50 focus:outline-none focus:border-[var(--primary)]"
            />
            <button
              onClick={handleAdd}
              disabled={loading || !newDimension.trim() || !newValue.trim()}
              className="px-2 py-1 rounded bg-[var(--primary)]/20 text-[var(--primary)] hover:bg-[var(--primary)]/30 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="px-2 py-1 rounded bg-[var(--card)] text-[var(--foreground-secondary)] hover:bg-[var(--border)]"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="group relative"
            onMouseEnter={() => setHoveredTag(tag.id)}
            onMouseLeave={() => setHoveredTag(null)}
          >
            {editingTag?.id === tag.id ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUpdate(tag)}
                  className="w-24 px-2 py-0.5 rounded bg-[var(--background)]/50 border border-[var(--primary)] text-sm text-[var(--foreground)] focus:outline-none"
                  autoFocus
                />
                <button onClick={() => handleUpdate(tag)} disabled={loading} className="text-[var(--success)] hover:text-[var(--success)]/80">
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => setEditingTag(null)} className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)]">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <TagCapsule
                  label={tag.value}
                  variant={tag.dimension === "需求意向" ? "success" : tag.dimension === "顾虑点" ? "danger" : "primary"}
                />

                <div className="hidden group-hover:flex absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
                  <div className="bg-[var(--background-card)] backdrop-blur-xl border border-[var(--border)] rounded-lg p-3 min-w-[200px] max-w-[300px] shadow-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-[var(--foreground-secondary)]">{tag.dimension}</span>
                      <div className="flex items-center gap-1">
                        {tag.audioRecordId && onViewTranscript && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onViewTranscript(tag.audioRecordId!, tag.sourceText)
                            }}
                            className="p-0.5 rounded hover:bg-[var(--primary)]/20 text-[var(--foreground-secondary)] hover:text-[var(--primary)]"
                            title="查看转写原文"
                          >
                            <FileAudio className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingTag(tag); setEditValue(tag.value) }}
                          className="p-0.5 rounded hover:bg-[var(--primary)]/20 text-[var(--foreground-secondary)] hover:text-[var(--primary)]"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(tag) }}
                          className="p-0.5 rounded hover:bg-[var(--danger)]/20 text-[var(--foreground-secondary)] hover:text-[var(--danger)]"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {tag.sourceText && (
                      <div className="mt-2 p-2 rounded bg-[var(--background)]/80 border border-[var(--border)]">
                        <div className="flex items-start gap-1.5">
                          <Quote className="w-3 h-3 text-[var(--primary)] mt-0.5 shrink-0" />
                          <p className="text-xs text-[var(--foreground-secondary)] leading-relaxed">{tag.sourceText}</p>
                        </div>
                        {tag.audioRecordId && (
                          <p className="text-[10px] text-[var(--foreground-muted)] mt-1">点击查看完整转写</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {tags.length === 0 && (
          <p className="text-sm text-[var(--foreground-secondary)]">暂无标签</p>
        )}
      </div>
    </div>
  )
}
