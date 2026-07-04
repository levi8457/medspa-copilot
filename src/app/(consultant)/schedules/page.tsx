"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, Plus, Clock, MapPin, Phone, MessageCircle, Users, ChevronLeft, ChevronRight, X, Check, MoreHorizontal } from "lucide-react"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { apiFetch } from "@/lib/api-fetch"

interface ScheduleItem {
  id: string
  title: string
  type: string
  startTime: string
  endTime: string | null
  status: string
  customerId: string | null
  notes: string | null
  customer: {
    id: string
    name: string
  } | null
}

const typeMap: Record<string, { label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string }> = {
  in_store: { label: "到店预约", icon: MapPin, color: "var(--success)" },
  phone_followup: { label: "电话跟进", icon: Phone, color: "var(--primary)" },
  wechat_followup: { label: "微信跟进", icon: MessageCircle, color: "var(--accent)" },
  meeting: { label: "会议", icon: Users, color: "var(--warning)" },
  other: { label: "其他", icon: Calendar, color: "var(--foreground-secondary)" },
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewMode, setViewMode] = useState<"day" | "list">("day")

  const [formData, setFormData] = useState({
    title: "",
    type: "phone_followup",
    startTime: "",
    endTime: "",
    customerId: "",
    reminderMinutes: 30,
    notes: "",
  })

  const fetchSchedules = async () => {
    setLoading(true)
    try {
      const dateStr = selectedDate.toISOString().split("T")[0]
      const res = await apiFetch(`/api/schedules?date=${dateStr}`)
      const result = await res.json()
      if (result.success) {
        setSchedules(result.data)
      }
    } catch (error) {
      console.error("获取日程失败:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSchedules()
  }, [selectedDate])

  const handleCreate = async () => {
    try {
      const res = await apiFetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const result = await res.json()
      if (result.success) {
        setShowCreateModal(false)
        setFormData({
          title: "",
          type: "phone_followup",
          startTime: "",
          endTime: "",
          customerId: "",
          reminderMinutes: 30,
          notes: "",
        })
        fetchSchedules()
      }
    } catch (error) {
      console.error("创建日程失败:", error)
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await apiFetch(`/api/schedules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setSchedules((prev) =>
          prev.map((s) => (s.id === id ? { ...s, status } : s))
        )
      }
    } catch (error) {
      console.error("更新日程失败:", error)
    }
  }

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  const formatDate = (date: Date) => {
    const weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
    return `${date.getMonth() + 1}月${date.getDate()}日 ${weekDays[date.getDay()]}`
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: "待执行", color: "var(--warning)" },
    completed: { label: "已完成", color: "var(--success)" },
    cancelled: { label: "已取消", color: "var(--danger)" },
    no_show: { label: "未到场", color: "var(--foreground-secondary)" },
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">日程管理</h1>
          <p className="text-[var(--foreground-secondary)] mt-1 text-sm">管理您的跟进日程和客户预约</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          新建日程
        </button>
      </div>

      <GlowCard>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeDate(-1)}
                className="p-1.5 hover:bg-[var(--border)] rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-[var(--foreground-secondary)]" />
              </button>
              <span className="text-lg font-medium text-[var(--foreground)] min-w-[140px] text-center">
                {formatDate(selectedDate)}
              </span>
              <button
                onClick={() => changeDate(1)}
                className="p-1.5 hover:bg-[var(--border)] rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-[var(--foreground-secondary)]" />
              </button>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="ml-2 px-3 py-1 text-sm bg-[var(--primary)]/10 text-[var(--primary)] rounded-md hover:bg-[var(--primary)]/20 transition-colors"
              >
                今天
              </button>
            </div>

            <div className="flex gap-1 bg-[var(--card)] p-1 rounded-lg">
              {[
                { key: "day", label: "日视图" },
                { key: "list", label: "列表" },
              ].map((mode) => (
                <button
                  key={mode.key}
                  onClick={() => setViewMode(mode.key as typeof viewMode)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    viewMode === mode.key
                      ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                      : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-16 text-[var(--foreground-secondary)]">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>当天暂无日程安排</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 text-sm bg-[var(--primary)]/10 text-[var(--primary)] rounded-lg hover:bg-[var(--primary)]/20 transition-colors"
              >
                添加第一个日程
              </button>
            </div>
          ) : viewMode === "day" ? (
            <div className="space-y-2">
              {schedules.map((schedule, index) => {
                const typeInfo = typeMap[schedule.type] || typeMap.other
                const statusInfo = statusMap[schedule.status] || statusMap.pending
                const Icon = typeInfo.icon

                return (
                  <motion.div
                    key={schedule.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-start gap-4 p-4 rounded-lg border-l-4 bg-[var(--card)]/50 hover:bg-[var(--card)] transition-colors ${
                      schedule.status === "completed" ? "opacity-60" : ""
                    }`}
                    style={{ borderLeftColor: typeInfo.color }}
                  >
                    <div className="text-center min-w-[60px]">
                      <div className="text-lg font-bold text-[var(--foreground)]">
                        {formatTime(schedule.startTime)}
                      </div>
                      {schedule.endTime && (
                        <div className="text-xs text-[var(--foreground-secondary)]">
                          {formatTime(schedule.endTime)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4" style={{ color: typeInfo.color }} />
                        <span
                          className={`font-medium ${
                            schedule.status === "completed" ? "line-through text-[var(--foreground-secondary)]" : "text-[var(--foreground)]"
                          }`}
                        >
                          {schedule.title}
                        </span>
                        <span
                          className="px-2 py-0.5 text-xs rounded"
                          style={{ backgroundColor: `${typeInfo.color}20`, color: typeInfo.color }}
                        >
                          {typeInfo.label}
                        </span>
                        <span
                          className="px-2 py-0.5 text-xs rounded"
                          style={{ backgroundColor: `${statusInfo.color}20`, color: statusInfo.color }}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                      {schedule.customer && (
                        <div className="text-sm text-[var(--foreground-secondary)]">
                          客户：{schedule.customer.name}
                        </div>
                      )}
                      {schedule.notes && (
                        <div className="text-sm text-[var(--foreground-secondary)] mt-1 line-clamp-1">
                          备注：{schedule.notes}
                        </div>
                      )}
                    </div>

                    {schedule.status === "pending" && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStatusChange(schedule.id, "completed")}
                          className="p-1.5 text-[var(--success)] hover:bg-[var(--success)]/10 rounded transition-colors"
                          title="标记完成"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 text-[var(--foreground-secondary)] hover:bg-[var(--border)] rounded transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {schedules.map((schedule) => {
                const typeInfo = typeMap[schedule.type] || typeMap.other
                return (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--card)]/50 hover:bg-[var(--card)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${typeInfo.color}20` }}
                      >
                        <typeInfo.icon className="w-5 h-5" style={{ color: typeInfo.color }} />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{schedule.title}</p>
                        <p className="text-xs text-[var(--foreground-secondary)]">
                          {formatTime(schedule.startTime)}
                          {schedule.customer && ` · ${schedule.customer.name}`}
                        </p>
                      </div>
                    </div>
                    <div
                      className="text-xs px-2 py-1 rounded"
                      style={{
                        backgroundColor: `${(statusMap[schedule.status] || statusMap.pending).color}20`,
                        color: (statusMap[schedule.status] || statusMap.pending).color,
                      }}
                    >
                      {(statusMap[schedule.status] || statusMap.pending).label}
                    </div>
                  </div>
                )
              })}
            </div>
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
                <h2 className="text-lg font-medium text-[var(--foreground)]">新建日程</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 hover:bg-[var(--border)] rounded transition-colors"
                >
                  <X className="w-5 h-5 text-[var(--foreground-secondary)]" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[var(--foreground-secondary)] mb-1.5">
                    日程标题
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="输入日程标题"
                    className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--foreground-secondary)] focus:outline-none focus:border-[var(--primary)]/50"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[var(--foreground-secondary)] mb-1.5">
                    类型
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(typeMap).map(([key, { label, color }]) => (
                      <button
                        key={key}
                        onClick={() => setFormData({ ...formData, type: key })}
                        className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                          formData.type === key
                            ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                            : "border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)]/30"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-[var(--foreground-secondary)] mb-1.5">
                      开始时间
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--foreground-secondary)] mb-1.5">
                      结束时间
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[var(--foreground-secondary)] mb-1.5">
                    提前提醒（分钟）
                  </label>
                  <select
                    value={formData.reminderMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, reminderMinutes: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]/50"
                  >
                    <option value={0}>不提醒</option>
                    <option value={15}>15分钟前</option>
                    <option value={30}>30分钟前</option>
                    <option value={60}>1小时前</option>
                    <option value={1440}>1天前</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-[var(--foreground-secondary)] mb-1.5">
                    备注
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="添加备注..."
                    rows={3}
                    className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--foreground-secondary)] focus:outline-none focus:border-[var(--primary)]/50 resize-none"
                  />
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
                  disabled={!formData.title || !formData.startTime}
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
