"use client"

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Edit, Trash2, CheckCircle, XCircle, Clock, FileText, Eye } from "lucide-react"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { SopEditor } from "@/components/sop/SopEditor"

interface SopStage {
  id: string
  label: string
  description?: string
  touchpointType: "phone" | "wechat" | "visit" | "sms"
  scriptTemplate?: string
  delayDays: number
  positionX: number
  positionY: number
}

interface SopTemplate {
  id: string
  name: string
  description?: string
  category?: string
  status: string
  createdAt: string
  stages: string
}

const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: "草稿", color: "var(--foreground-secondary)", icon: <FileText className="w-4 h-4" /> },
  submitted: { label: "待审核", color: "var(--warning)", icon: <Clock className="w-4 h-4" /> },
  approved: { label: "已通过", color: "var(--success)", icon: <CheckCircle className="w-4 h-4" /> },
  rejected: { label: "已驳回", color: "var(--danger)", icon: <XCircle className="w-4 h-4" /> },
}

export default function SopManagementPage() {
  const [sops, setSops] = useState<SopTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSop, setSelectedSop] = useState<SopTemplate | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isViewing, setIsViewing] = useState(false)

  const fetchSops = async () => {
    try {
      const response = await fetch("/api/sops")
      const result = await response.json()
      if (result.success) {
        setSops(result.data)
      }
    } catch (error) {
      console.error("获取 SOP 列表失败:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSops()
  }, [])

  const handleCreate = () => {
    setSelectedSop(null)
    setIsEditing(true)
  }

  const handleEdit = (sop: SopTemplate) => {
    setSelectedSop(sop)
    setIsEditing(true)
  }

  const handleView = (sop: SopTemplate) => {
    setSelectedSop(sop)
    setIsViewing(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除此 SOP 吗？")) return

    try {
      await fetch(`/api/sops/${id}`, { method: "DELETE" })
      fetchSops()
    } catch (error) {
      console.error("删除 SOP 失败:", error)
    }
  }

  const handleSubmit = async (sop: Partial<SopTemplate>) => {
    try {
      if (selectedSop) {
        await fetch(`/api/sops/${selectedSop.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sop),
        })
      } else {
        await fetch("/api/sops", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sop),
        })
      }
      setIsEditing(false)
      fetchSops()
    } catch (error) {
      console.error("保存 SOP 失败:", error)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-8 w-48 bg-[var(--card)] animate-pulse rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-[var(--card)] animate-pulse rounded-xl" />
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              SOP 管理
            </h1>
            <p className="text-[var(--foreground-secondary)] mt-1">
              管理机构标准化流程模板
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            新建 SOP
          </button>
        </div>

        {/* SOP List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {sops.map((sop, index) => {
              const statusInfo = statusMap[sop.status] || statusMap.draft
              let stageCount = 0
              try {
                const stages = JSON.parse(sop.stages) as SopStage[]
                stageCount = stages.length
              } catch {}

              return (
                <motion.div
                  key={sop.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <GlowCard className="p-4 h-full">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                          style={{ backgroundColor: `${statusInfo.color}20`, color: statusInfo.color }}
                        >
                          {statusInfo.icon}
                          {statusInfo.label}
                        </span>
                        {sop.category && (
                          <span className="px-2 py-0.5 rounded text-xs bg-[var(--card)] text-[var(--foreground-secondary)]">
                            {sop.category}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleView(sop)}
                          className="p-1.5 hover:bg-[var(--border)] rounded transition-colors"
                          title="查看"
                        >
                          <Eye className="w-4 h-4 text-[var(--foreground-secondary)]" />
                        </button>
                        <button
                          onClick={() => handleEdit(sop)}
                          className="p-1.5 hover:bg-[var(--border)] rounded transition-colors"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4 text-[var(--foreground-secondary)]" />
                        </button>
                        <button
                          onClick={() => handleDelete(sop.id)}
                          className="p-1.5 hover:bg-[var(--danger)]/20 rounded transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4 text-[var(--danger)]" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-medium text-[var(--foreground)] mb-2">
                      {sop.name}
                    </h3>
                    {sop.description && (
                      <p className="text-sm text-[var(--foreground-secondary)] line-clamp-2">
                        {sop.description}
                      </p>
                    )}

                    <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--foreground-secondary)]">
                      <span>{stageCount} 个阶段</span>
                      <span>创建于 {new Date(sop.createdAt).toLocaleDateString()}</span>
                    </div>
                  </GlowCard>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {sops.length === 0 && (
            <GlowCard className="col-span-full p-8 text-center">
              <FileText className="w-12 h-12 text-[var(--foreground-secondary)] mx-auto mb-4" />
              <p className="text-[var(--foreground)] font-medium">暂无 SOP 模板</p>
              <p className="text-sm text-[var(--foreground-secondary)] mt-1">
                点击「新建 SOP」创建第一个模板
              </p>
            </GlowCard>
          )}
        </div>

        {/* Edit Modal */}
        <AnimatePresence>
          {isEditing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => setIsEditing(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[var(--card)] rounded-xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">
                  {selectedSop ? "编辑 SOP" : "新建 SOP"}
                </h2>
                <SopForm
                  initialData={selectedSop}
                  onSubmit={handleSubmit}
                  onCancel={() => setIsEditing(false)}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Modal */}
        <AnimatePresence>
          {isViewing && selectedSop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => setIsViewing(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[var(--card)] rounded-xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-[var(--foreground)]">{selectedSop.name}</h2>
                  <button
                    onClick={() => setIsViewing(false)}
                    className="p-2 hover:bg-[var(--border)] rounded-lg transition-colors"
                  >
                    <XCircle className="w-5 h-5 text-[var(--foreground-secondary)]" />
                  </button>
                </div>
                {selectedSop.description && (
                  <p className="text-sm text-[var(--foreground-secondary)] mb-4">{selectedSop.description}</p>
                )}
                <SopEditor
                  initialStages={(() => {
                    try {
                      return JSON.parse(selectedSop.stages) as SopStage[]
                    } catch {
                      return []
                    }
                  })()}
                  readOnly
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function SopForm({
  initialData,
  onSubmit,
  onCancel,
}: {
  initialData?: SopTemplate | null
  onSubmit: (data: Partial<SopTemplate>) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initialData?.name || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [category, setCategory] = useState(initialData?.category || "")
  const [stages, setStages] = useState<SopStage[]>([])

  useEffect(() => {
    if (initialData?.stages) {
      try {
        setStages(JSON.parse(initialData.stages))
      } catch {
        setStages([])
      }
    }
  }, [initialData])

  const handleStagesChange = useCallback((newStages: SopStage[]) => {
    setStages(newStages)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ name, description, category, stages: JSON.stringify(stages) })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
            SOP 名称
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            placeholder="例如：水光针客户 90 天复购 SOP"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
            分类
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="">请选择分类</option>
            <option value="新客转化">新客转化</option>
            <option value="复购激活">复购激活</option>
            <option value="流失挽回">流失挽回</option>
            <option value="节日营销">节日营销</option>
            <option value="其他">其他</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
          描述
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] h-20 resize-none"
          placeholder="简要描述此 SOP 的适用场景和目标"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          流程设计
        </label>
        <SopEditor
          initialStages={stages}
          onChange={handleStagesChange}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-[var(--foreground-secondary)] hover:bg-[var(--border)] rounded-lg transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          {initialData ? "保存" : "创建"}
        </button>
      </div>
    </form>
  )
}
