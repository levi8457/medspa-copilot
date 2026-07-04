"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Plus, Phone, MessageCircle, User, ChevronRight, GripVertical, ArrowRight, X, RotateCcw, Upload, CheckCircle } from "lucide-react"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { HudPanel } from "@/components/futuristic/HudPanel"
import { TagCapsule } from "@/components/futuristic/TagCapsule"
import { apiFetch } from "@/lib/api-fetch"

const statusMap: Record<string, { label: string; color: string }> = {
  lead: { label: "线索", color: "var(--accent)" },
  contacted: { label: "已联系", color: "var(--primary)" },
  negotiating: { label: "洽谈中", color: "var(--warning)" },
  converted: { label: "已成交", color: "var(--success)" },
  churned: { label: "已流失", color: "var(--danger)" },
}

const sourceMap: Record<string, { label: string; color: string }> = {
  wechat: { label: "微信", color: "var(--primary)" },
  phone: { label: "电话", color: "var(--accent)" },
  website: { label: "官网", color: "var(--success)" },
  referral: { label: "转介绍", color: "var(--warning)" },
  other: { label: "其他", color: "var(--foreground-secondary)" },
}

interface Lead {
  id: string
  name: string
  phone: string
  wechat: string
  status: string
  source: string
  consultantName: string
  createdAt: string
  tags: Array<{ dimension: string; value: string }>
}

interface LeadSource {
  id: string
  name: string
  code: string
  isActive: boolean
}

interface AssignmentRule {
  id: string
  name: string
  type: string
  isActive: boolean
  priority: number
}

export default function LeadsManagementPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, unassigned: 0, todayNew: 0, avgResponseTime: 0 })
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [sources, setSources] = useState<LeadSource[]>([])
  const [rules, setRules] = useState<AssignmentRule[]>([])
  
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [assignConsultantId, setAssignConsultantId] = useState("")
  const [consultants, setConsultants] = useState<Array<{ id: string; name: string }>>([])
  
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkFile, setBulkFile] = useState<File | null>(null)

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set("search", searchQuery)
      if (statusFilter) params.set("status", statusFilter)
      
      const res = await apiFetch(`/api/admin/leads?${params}`)
      const result = await res.json()
      if (result.success) {
        setLeads(result.data.leads)
        setStats(result.data.stats)
      }
    } catch (error) {
      console.error("获取线索数据失败:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSources = async () => {
    try {
      const res = await apiFetch("/api/admin/lead-sources")
      const result = await res.json()
      if (result.success) {
        setSources(result.data)
      }
    } catch (error) {
      console.error("获取渠道数据失败:", error)
    }
  }

  const fetchRules = async () => {
    try {
      const res = await apiFetch("/api/admin/assignment-rules")
      const result = await res.json()
      if (result.success) {
        setRules(result.data)
      }
    } catch (error) {
      console.error("获取分配规则失败:", error)
    }
  }

  useEffect(() => {
    fetchLeads()
    fetchSources()
    fetchRules()
  }, [searchQuery, statusFilter])

  useEffect(() => {
    const fetchConsultants = async () => {
      try {
        const res = await apiFetch("/api/team")
        const result = await res.json()
        if (result.success) {
          setConsultants(result.data.members.map((m: any) => ({ id: m.id, name: m.name })))
        }
      } catch (error) {
        console.error("获取咨询师列表失败:", error)
      }
    }
    fetchConsultants()
  }, [])

  const handleSelectLead = (id: string) => {
    setSelectedLeads(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const handleSelectAll = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([])
    } else {
      setSelectedLeads(leads.map(l => l.id))
    }
  }

  const handleBatchAssign = async () => {
    if (!assignConsultantId || selectedLeads.length === 0) return
    
    try {
      const res = await apiFetch("/api/admin/leads/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: selectedLeads, consultantId: assignConsultantId }),
      })
      const result = await res.json()
      if (result.success) {
        setShowAssignModal(false)
        setSelectedLeads([])
        setAssignConsultantId("")
        fetchLeads()
      }
    } catch (error) {
      console.error("批量分配失败:", error)
    }
  }

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bulkFile) return

    const formData = new FormData()
    formData.append("file", bulkFile)

    try {
      const res = await apiFetch("/api/admin/leads/bulk", {
        method: "POST",
        body: formData,
      })
      const result = await res.json()
      if (result.success) {
        setShowBulkModal(false)
        setBulkFile(null)
        fetchLeads()
      }
    } catch (error) {
      console.error("批量导入失败:", error)
    }
  }

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const res = await apiFetch(`/api/customers/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      const result = await res.json()
      if (result.success) {
        fetchLeads()
      }
    } catch (error) {
      console.error("更新状态失败:", error)
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">线索管理</h1>
            <p className="text-[var(--foreground-secondary)] mt-1">管理机构全部线索，追踪转化进度</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowBulkModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              <Upload className="w-4 h-4" />
              批量导入
            </button>
            <button
              onClick={() => setShowAssignModal(true)}
              disabled={selectedLeads.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
              分配 ({selectedLeads.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <HudPanel label="总线索数" value={stats.total.toString()} icon={<User />} />
          <HudPanel label="待分配" value={stats.unassigned.toString()} icon={<GripVertical />} />
          <HudPanel label="今日新增" value={stats.todayNew.toString()} icon={<CheckCircle />} />
          <HudPanel label="平均响应" value={stats.avgResponseTime.toString()} unit="分钟" icon={<Phone />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <GlowCard className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-[var(--foreground)]">线索列表</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedLeads.length === leads.length && leads.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 accent-[var(--primary)]"
                />
                <span className="text-sm text-[var(--foreground-secondary)]">全选</span>
              </label>
            </div>

            <div className="flex gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--foreground-secondary)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索姓名、手机号..."
                  className="w-full pl-12 pr-4 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]/50 focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="">全部状态</option>
                {Object.entries(statusMap).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              {leads.length === 0 ? (
                <div className="p-8 text-center text-[var(--foreground-secondary)]">
                  暂无线索数据
                </div>
              ) : (
                leads.map((lead) => {
                  const statusInfo = statusMap[lead.status] || statusMap.lead
                  const sourceInfo = sourceMap[lead.source || "other"] || sourceMap.other

                  return (
                    <motion.div
                      key={lead.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 rounded-xl border transition-all ${
                        selectedLeads.includes(lead.id)
                          ? "border-[var(--primary)] bg-[var(--primary)]/5"
                          : "border-[var(--border)] hover:border-[var(--primary)]/50"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={selectedLeads.includes(lead.id)}
                          onChange={() => handleSelectLead(lead.id)}
                          className="w-4 h-4 accent-[var(--primary)] mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-[var(--foreground)]">{lead.name}</span>
                            <span
                              className="px-2 py-0.5 rounded text-xs"
                              style={{ backgroundColor: `${statusInfo.color}20`, color: statusInfo.color }}
                            >
                              {statusInfo.label}
                            </span>
                            <span
                              className="px-2 py-0.5 rounded text-xs"
                              style={{ backgroundColor: `${sourceInfo.color}20`, color: sourceInfo.color }}
                            >
                              {sourceInfo.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-[var(--foreground-secondary)] mb-2">
                            {lead.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {lead.phone}
                              </span>
                            )}
                            {lead.wechat && (
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                {lead.wechat}
                              </span>
                            )}
                            {lead.consultantName && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {lead.consultantName}
                              </span>
                            )}
                          </div>
                          {lead.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {lead.tags.slice(0, 3).map((tag, idx) => (
                                <TagCapsule key={idx} label={tag.value} variant="primary" />
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                            className="px-2 py-1 text-xs rounded border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:border-[var(--primary)]"
                          >
                            {Object.entries(statusMap).map(([key, { label }]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                          <ChevronRight className="w-4 h-4 text-[var(--foreground-secondary)]" />
                        </div>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>
          </GlowCard>

          <div className="space-y-6">
            <GlowCard className="p-6">
              <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">来源渠道</h2>
              <div className="space-y-2">
                {sources.map((source) => (
                  <div key={source.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--background)]/50">
                    <span className="text-sm text-[var(--foreground)]">{source.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${source.isActive ? "bg-[var(--success)]/20 text-[var(--success)]" : "bg-[var(--foreground-secondary)]/20 text-[var(--foreground-secondary)]"}`}>
                      {source.isActive ? "启用" : "停用"}
                    </span>
                  </div>
                ))}
                {sources.length === 0 && (
                  <div className="text-center text-sm text-[var(--foreground-secondary)] py-4">暂无渠道配置</div>
                )}
              </div>
            </GlowCard>

            <GlowCard className="p-6">
              <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">分配规则</h2>
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div key={rule.id} className="p-2 rounded-lg bg-[var(--background)]/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-[var(--foreground)]">{rule.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${rule.isActive ? "bg-[var(--success)]/20 text-[var(--success)]" : "bg-[var(--danger)]/20 text-[var(--danger)]"}`}>
                        {rule.isActive ? "启用" : "禁用"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--foreground-secondary)]">
                      <span>{rule.type === "round_robin" ? "轮询分配" : rule.type === "load_balanced" ? "负载均衡" : "手动分配"}</span>
                      <span>优先级: {rule.priority}</span>
                    </div>
                  </div>
                ))}
                {rules.length === 0 && (
                  <div className="text-center text-sm text-[var(--foreground-secondary)] py-4">暂无分配规则</div>
                )}
              </div>
            </GlowCard>
          </div>
        </div>

        <AnimatePresence>
          {showAssignModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setShowAssignModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-medium text-[var(--foreground)]">分配线索</h2>
                  <button onClick={() => setShowAssignModal(false)} className="p-1 hover:bg-[var(--border)] rounded transition-colors">
                    <X className="w-5 h-5 text-[var(--foreground-secondary)]" />
                  </button>
                </div>
                <p className="text-sm text-[var(--foreground-secondary)] mb-4">
                  已选择 {selectedLeads.length} 条线索，分配给：
                </p>
                <select
                  value={assignConsultantId}
                  onChange={(e) => setAssignConsultantId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] mb-6"
                >
                  <option value="">请选择咨询师</option>
                  {consultants.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 text-[var(--foreground-secondary)] hover:bg-[var(--border)] rounded-lg transition-colors">
                    取消
                  </button>
                  <button
                    onClick={handleBatchAssign}
                    disabled={!assignConsultantId}
                    className="px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    确认分配
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showBulkModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setShowBulkModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-medium text-[var(--foreground)]">批量导入线索</h2>
                  <button onClick={() => setShowBulkModal(false)} className="p-1 hover:bg-[var(--border)] rounded transition-colors">
                    <X className="w-5 h-5 text-[var(--foreground-secondary)]" />
                  </button>
                </div>
                <form onSubmit={handleBulkUpload} className="space-y-4">
                  <div className="p-4 border border-dashed border-[var(--border)] rounded-lg text-center hover:border-[var(--primary)] transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="bulk-file"
                    />
                    <label htmlFor="bulk-file" className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-[var(--foreground-secondary)]" />
                      <p className="text-sm text-[var(--foreground-secondary)]">点击选择文件</p>
                      <p className="text-xs text-[var(--foreground-muted)] mt-1">支持 CSV、Excel 格式</p>
                    </label>
                  </div>
                  {bulkFile && (
                    <p className="text-sm text-[var(--foreground)]">已选择: {bulkFile.name}</p>
                  )}
                  <div className="p-3 bg-[var(--background)]/50 rounded-lg text-xs text-[var(--foreground-secondary)]">
                    <p className="font-medium mb-1">导入格式要求:</p>
                    <p>姓名*, 手机号, 微信号, 来源渠道, 备注</p>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => setShowBulkModal(false)} className="px-4 py-2 text-[var(--foreground-secondary)] hover:bg-[var(--border)] rounded-lg transition-colors">
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={!bulkFile}
                      className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      开始导入
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