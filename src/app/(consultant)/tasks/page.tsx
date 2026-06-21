"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, Clock, CheckCircle, AlertCircle, Filter, Copy, MessageSquare, Loader2, Sparkles, Check } from "lucide-react"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { HudPanel } from "@/components/futuristic/HudPanel"

interface Task {
  id: string
  customerId: string
  customerName: string
  planTitle?: string
  objective?: string
  scriptDirection?: string
  scheduledDate: string
  status: string
  priority: number
}

interface ScriptData {
  script: string
  subjectLine: string
  keyPoints: string[]
  compliancePassed: boolean
  complianceWarnings: string[]
}

type StatusFilter = "all" | "pending" | "done" | "skipped"

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, skipped: 0 })
  const [generatingScript, setGeneratingScript] = useState<string | null>(null)
  const [scriptCache, setScriptCache] = useState<Record<string, ScriptData>>({})
  const [streamingText, setStreamingText] = useState<Record<string, string>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchTasks = async () => {
    try {
      const response = await fetch("/api/dashboard/daily")
      const result = await response.json()
      if (result.success) {
        setTasks(result.data.tasks)
        setStats(result.data.stats)
      }
    } catch (error) {
      console.error("获取任务列表失败:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const filteredTasks = tasks.filter((task) => {
    if (statusFilter === "all") return true
    return task.status === statusFilter
  })

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      fetchTasks()
    } catch (error) {
      console.error("更新任务状态失败:", error)
    }
  }

  const handleGenerateScript = useCallback(async (task: Task) => {
    setGeneratingScript(task.id)
    setStreamingText((prev) => ({ ...prev, [task.id]: "" }))

    try {
      const response = await fetch("/api/scripts/generate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, customerId: task.customerId }),
      })

      if (!response.ok) throw new Error("生成失败")

      const reader = response.body?.getReader()
      if (!reader) throw new Error("无法读取流")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === "chunk") {
                setStreamingText((prev) => ({
                  ...prev,
                  [task.id]: (prev[task.id] || "") + data.content,
                }))
              } else if (data.type === "done") {
                setScriptCache((prev) => ({
                  ...prev,
                  [task.id]: {
                    script: data.script,
                    subjectLine: data.subjectLine,
                    keyPoints: data.keyPoints,
                    compliancePassed: data.compliancePassed,
                    complianceWarnings: data.complianceWarnings,
                  },
                }))
                setStreamingText((prev) => {
                  const next = { ...prev }
                  delete next[task.id]
                  return next
                })
              } else if (data.type === "error") {
                console.error("生成错误:", data.message)
              }
            } catch {}
          }
        }
      }
    } catch (error) {
      console.error("生成话术失败:", error)
    } finally {
      setGeneratingScript(null)
    }
  }, [])

  const handleCopyScript = useCallback(async (taskId: string, script: string) => {
    try {
      await navigator.clipboard.writeText(script)
      setCopiedId(taskId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = script
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopiedId(taskId)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen p-6">
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
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">跟进任务</h1>
            <p className="text-[var(--foreground-secondary)] mt-1">管理所有跟进任务</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <HudPanel label="总任务" value={stats.total.toString()} icon={<Calendar />} />
          <HudPanel label="待处理" value={stats.pending.toString()} icon={<Clock />} />
          <HudPanel label="已完成" value={stats.completed.toString()} icon={<CheckCircle />} />
          <HudPanel label="已跳过" value={stats.skipped.toString()} icon={<AlertCircle />} />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--foreground-secondary)]" />
          {(["all", "pending", "done", "skipped"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === filter
                  ? "bg-[var(--primary)] text-[var(--background)]"
                  : "bg-[var(--card)] text-[var(--foreground-secondary)] hover:bg-[var(--border)]"
              }`}
            >
              {filter === "all" ? "全部" : filter === "pending" ? "待处理" : filter === "done" ? "已完成" : "已跳过"}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <AnimatePresence>
            {filteredTasks.map((task, index) => {
              const script = scriptCache[task.id]
              const streaming = streamingText[task.id]
              const isGenerating = generatingScript === task.id
              const isCopied = copiedId === task.id
              const hasStream = streaming !== undefined && streaming !== ""

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlowCard className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-medium text-[var(--foreground)]">{task.customerName}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              task.status === "done"
                                ? "bg-[var(--success)]/20 text-[var(--success)]"
                                : task.status === "pending"
                                ? "bg-[var(--warning)]/20 text-[var(--warning)]"
                                : "bg-[var(--foreground-secondary)]/20 text-[var(--foreground-secondary)]"
                            }`}
                          >
                            {task.status === "done" ? "已完成" : task.status === "pending" ? "待处理" : "已跳过"}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--foreground-secondary)]">{task.objective}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-[var(--foreground-secondary)]">
                          <span>
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {new Date(task.scheduledDate).toLocaleDateString()}
                          </span>
                          {task.planTitle && <span>计划：{task.planTitle}</span>}
                        </div>
                      </div>

                      {task.status === "pending" && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleGenerateScript(task)}
                            disabled={isGenerating}
                            className="flex items-center gap-1 px-3 py-1.5 bg-[var(--primary)]/20 text-[var(--primary)] rounded-lg text-sm hover:bg-[var(--primary)]/30 transition-colors disabled:opacity-50"
                          >
                            {isGenerating ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Sparkles className="w-3 h-3" />
                            )}
                            {isGenerating ? "生成中" : "生成话术"}
                          </button>
                          <button
                            onClick={() => handleStatusChange(task.id, "done")}
                            className="px-3 py-1.5 bg-[var(--success)]/20 text-[var(--success)] rounded-lg text-sm hover:bg-[var(--success)]/30 transition-colors"
                          >
                            完成
                          </button>
                          <button
                            onClick={() => handleStatusChange(task.id, "skipped")}
                            className="px-3 py-1.5 bg-[var(--card)] text-[var(--foreground-secondary)] rounded-lg text-sm hover:bg-[var(--border)] transition-colors"
                          >
                            跳过
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Streaming text display */}
                    <AnimatePresence>
                      {hasStream && !script && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t border-[var(--border)]"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-4 h-4 text-[var(--primary)]" />
                            <span className="text-sm font-medium text-[var(--foreground)]">AI 正在生成话术...</span>
                            <Loader2 className="w-3 h-3 animate-spin text-[var(--primary)]" />
                          </div>
                          <div className="p-3 rounded-lg bg-[var(--background)]/80 border border-[var(--border)]">
                            <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">
                              {streaming}
                              <span className="inline-block w-0.5 h-4 bg-[var(--primary)] animate-pulse ml-0.5" />
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Final script display */}
                    <AnimatePresence>
                      {script && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t border-[var(--border)]"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-[var(--primary)]" />
                              <span className="text-sm font-medium text-[var(--foreground)]">AI 生成话术</span>
                              {script.compliancePassed ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--success)]/20 text-[var(--success)]">
                                  合规通过
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--warning)]/20 text-[var(--warning)]">
                                  有风险提示
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => handleCopyScript(task.id, script.script)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                isCopied
                                  ? "bg-[var(--success)]/20 text-[var(--success)]"
                                  : "bg-[var(--card)] text-[var(--foreground-secondary)] hover:bg-[var(--border)]"
                              }`}
                            >
                              {isCopied ? (
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
                          <div className="p-3 rounded-lg bg-[var(--background)]/80 border border-[var(--border)]">
                            <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">
                              {script.script}
                            </p>
                          </div>
                          {script.keyPoints.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {script.keyPoints.map((point, i) => (
                                <span key={i} className="px-2 py-0.5 rounded text-xs bg-[var(--primary)]/10 text-[var(--primary)]">
                                  {point}
                                </span>
                              ))}
                            </div>
                          )}
                          {script.complianceWarnings.length > 0 && (
                            <div className="mt-2 p-2 rounded bg-[var(--warning)]/10 border border-[var(--warning)]/20">
                              {script.complianceWarnings.map((w, i) => (
                                <p key={i} className="text-xs text-[var(--warning)]">{w}</p>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </GlowCard>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {filteredTasks.length === 0 && (
            <GlowCard className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-[var(--success)] mx-auto mb-4" />
              <p className="text-[var(--foreground)] font-medium">
                {statusFilter === "all" ? "暂无任务" : "没有符合条件的任务"}
              </p>
            </GlowCard>
          )}
        </div>
      </div>
    </div>
  )
}
