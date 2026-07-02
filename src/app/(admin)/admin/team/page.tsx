"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Users, TrendingUp, Clock, CheckCircle, UserPlus, Edit, Trash2, X } from "lucide-react"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { HudPanel } from "@/components/futuristic/HudPanel"

interface TeamMember {
  id: string
  name: string
  email: string
  phone: string
  role: string
  customers: number
  conversionRate: number
  completionRate: number
  isActive: boolean
}

const emptyForm = { name: "", phone: "", password: "" }
const emptyEditForm = { name: "", phone: "", role: "consultant" as "consultant" | "org_admin", isActive: true }

export default function TeamManagementPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    avgConversionRate: 0,
    avgCompletionRate: 0,
  })
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  // 编辑相关状态
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyEditForm)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchTeamData = async () => {
    try {
      const res = await fetch("/api/admin/team")
      const result = await res.json()
      if (result.success) {
        setMembers(result.data.members)
        setStats(result.data.stats)
      }
    } catch (error) {
      console.error("获取团队数据失败:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeamData()
  }, [])

  const handleAddMember = async () => {
    setError("")
    if (!form.name.trim() || !form.phone.trim() || !form.password.trim()) {
      setError("请填写所有字段")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          password: form.password,
          role: "consultant",
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error?.message || "添加失败")
        return
      }
      setShowModal(false)
      setForm(emptyForm)
      fetchTeamData()
    } catch {
      setError("网络错误，请稍后重试")
    } finally {
      setSubmitting(false)
    }
  }

  const openEditModal = (member: TeamMember) => {
    setEditingId(member.id)
    setEditForm({
      name: member.name,
      phone: member.phone,
      role: member.role as "consultant" | "org_admin",
      isActive: member.isActive,
    })
    setEditError("")
  }

  const handleEditSave = async () => {
    if (!editingId) return
    setEditError("")
    if (!editForm.name.trim() || !editForm.phone.trim()) {
      setEditError("请填写姓名和手机号")
      return
    }

    setEditSubmitting(true)
    try {
      const res = await fetch(`/api/team/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          phone: editForm.phone,
          role: editForm.role,
          isActive: editForm.isActive,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEditError(data.error?.message || "更新失败")
        return
      }
      setEditingId(null)
      setEditForm(emptyEditForm)
      fetchTeamData()
    } catch {
      setEditError("网络错误，请稍后重试")
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDelete = async (member: TeamMember) => {
    const confirmed = window.confirm(
      `确定要删除成员「${member.name}」吗？\n该操作将同时删除其名下的客户、录音和跟进任务，且不可恢复。`
    )
    if (!confirmed) return

    setDeletingId(member.id)
    try {
      const res = await fetch(`/api/team/${member.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error?.message || "删除失败")
        return
      }
      fetchTeamData()
    } catch {
      alert("网络错误，请稍后重试")
    } finally {
      setDeletingId(null)
    }
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              团队管理
            </h1>
            <p className="text-[var(--foreground-secondary)] mt-1">
              管理咨询师团队
            </p>
          </div>
          <button
            onClick={() => { setShowModal(true); setError(""); setForm(emptyForm) }}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            <UserPlus className="w-4 h-4" />
            添加成员
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <HudPanel label="团队成员" value={stats.totalMembers.toString()} icon={<Users />} />
          <HudPanel label="活跃成员" value={stats.activeMembers.toString()} icon={<CheckCircle />} />
          <HudPanel label="平均转化率" value={stats.avgConversionRate.toFixed(1)} unit="%" icon={<TrendingUp />} />
          <HudPanel label="平均完成率" value={stats.avgCompletionRate.toFixed(1)} unit="%" icon={<Clock />} />
        </div>

        {/* Team List */}
        <GlowCard className="p-6">
          <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">团队成员</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">成员</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">角色</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">客户数</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">转化率</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">完成率</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">状态</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">操作</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member, index) => (
                  <motion.tr
                    key={member.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] font-medium">
                          {member.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-[var(--foreground)]">{member.name}</p>
                          <p className="text-sm text-[var(--foreground-secondary)]">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-xs bg-[var(--card)] text-[var(--foreground-secondary)] rounded">咨询师</span>
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--foreground)]">{member.customers}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-medium ${member.conversionRate >= 70 ? "text-[var(--success)]" : member.conversionRate >= 60 ? "text-[var(--warning)]" : "text-[var(--danger)]"}`}>
                        {member.conversionRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-[var(--card)] rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--primary)] rounded-full" style={{ width: `${member.completionRate}%` }} />
                        </div>
                        <span className="text-sm text-[var(--foreground-secondary)]">{member.completionRate}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 text-xs rounded ${member.isActive ? "bg-[var(--success)]/20 text-[var(--success)]" : "bg-[var(--foreground-secondary)]/20 text-[var(--foreground-secondary)]"}`}>
                        {member.isActive ? "活跃" : "停用"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(member)}
                          className="p-1.5 hover:bg-[var(--border)] rounded transition-colors"
                          title="编辑成员"
                        >
                          <Edit className="w-4 h-4 text-[var(--foreground-secondary)]" />
                        </button>
                        <button
                          onClick={() => handleDelete(member)}
                          disabled={deletingId === member.id}
                          className="p-1.5 hover:bg-[var(--danger)]/20 rounded transition-colors disabled:opacity-50"
                          title="删除成员"
                        >
                          <Trash2 className="w-4 h-4 text-[var(--danger)]" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlowCard>

        {/* Add Member Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-medium text-[var(--foreground)]">添加成员</h2>
                  <button onClick={() => setShowModal(false)} className="p-1 hover:bg-[var(--border)] rounded transition-colors">
                    <X className="w-5 h-5 text-[var(--foreground-secondary)]" />
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[var(--foreground-secondary)] mb-1">姓名</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="请输入姓名"
                      className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--foreground-secondary)] mb-1">手机号</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="请输入手机号"
                      maxLength={11}
                      className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--foreground-secondary)] mb-1">密码</label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="请设置初始密码"
                      className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-[var(--foreground-secondary)] hover:bg-[var(--border)] rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAddMember}
                    disabled={submitting}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {submitting ? "添加中..." : "确认添加"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Member Modal */}
        <AnimatePresence>
          {editingId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setEditingId(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-medium text-[var(--foreground)]">编辑成员</h2>
                  <button onClick={() => setEditingId(null)} className="p-1 hover:bg-[var(--border)] rounded transition-colors">
                    <X className="w-5 h-5 text-[var(--foreground-secondary)]" />
                  </button>
                </div>

                {editError && (
                  <div className="mb-4 p-3 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-sm">
                    {editError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[var(--foreground-secondary)] mb-1">姓名</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="请输入姓名"
                      className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--foreground-secondary)] mb-1">手机号</label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="请输入手机号"
                      maxLength={11}
                      className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--foreground-secondary)] mb-1">角色</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value as "consultant" | "org_admin" })}
                      className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
                    >
                      <option value="consultant">咨询师</option>
                      <option value="org_admin">机构管理员</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={editForm.isActive}
                      onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                      className="w-4 h-4 accent-[var(--primary)]"
                    />
                    <label htmlFor="isActive" className="text-sm text-[var(--foreground-secondary)] cursor-pointer">
                      账号启用（取消勾选将停用该账号）
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-4 py-2 text-[var(--foreground-secondary)] hover:bg-[var(--border)] rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleEditSave}
                    disabled={editSubmitting}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {editSubmitting ? "保存中..." : "保存修改"}
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
