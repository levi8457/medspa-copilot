"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { Search, Plus, Building2, Eye, RefreshCw, AlertCircle, X } from "lucide-react"

interface Plan {
  id: string
  name: string
}

interface Subscription {
  id: string
  status: string
  seatsUsed: number
  seatsLimit: number
  plan: Plan
}

interface Organization {
  id: string
  name: string
  isActive: boolean
  createdAt: string
  subscription: Subscription | null
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string }
}

const statusFilters = [
  { value: "all", label: "全部" },
  { value: "trial", label: "试用中" },
  { value: "active", label: "有效" },
  { value: "suspended", label: "已暂停" },
  { value: "expired", label: "已过期" },
] as const

const subscriptionStatusMap: Record<string, { label: string; color: string }> = {
  trial: { label: "试用中", color: "var(--accent)" },
  active: { label: "有效", color: "var(--success)" },
  suspended: { label: "已暂停", color: "var(--warning)" },
  expired: { label: "已过期", color: "var(--danger)" },
  cancelled: { label: "已取消", color: "var(--foreground-secondary)" },
}

function getSubStatusInfo(status: string | undefined) {
  if (!status) return { label: "未订阅", color: "var(--foreground-secondary)" }
  return subscriptionStatusMap[status] || { label: status, color: "var(--foreground-secondary)" }
}

export default function OrganizationsListPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showCreateModal, setShowCreateModal] = useState(false)

  const fetchOrganizations = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/platform/organizations")
      const json: ApiResponse<Organization[]> = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "获取机构列表失败")
      }
      setOrganizations(json.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取机构列表失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const filteredOrgs = useMemo(() => {
    return organizations.filter((org) => {
      const matchSearch =
        !searchQuery ||
        org.name.toLowerCase().includes(searchQuery.toLowerCase())
      const subStatus = org.subscription?.status
      const matchStatus =
        statusFilter === "all" ||
        subStatus === statusFilter ||
        (statusFilter === "expired" && !subStatus)
      return matchSearch && matchStatus
    })
  }, [organizations, searchQuery, statusFilter])

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">机构管理</h1>
            <p className="text-[var(--foreground-secondary)] mt-1">
              管理平台所有机构及订阅
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            创建机构
          </button>
        </div>

        <GlowCard variant="primary" className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-secondary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索机构名称..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
              />
            </div>
            <button
              onClick={fetchOrganizations}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              刷新
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-4">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  statusFilter === filter.value
                    ? "bg-[var(--primary)] text-[var(--background)]"
                    : "bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)]"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-4 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--danger)] flex-shrink-0" />
              <p className="text-sm text-[var(--danger)]">{error}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">
                    机构名称
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">
                    状态
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">
                    套餐
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">
                    席位
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">
                    创建时间
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-[var(--foreground-secondary)]">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[var(--foreground-secondary)]">
                      <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                      加载中...
                    </td>
                  </tr>
                ) : filteredOrgs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[var(--foreground-secondary)]">
                      <Building2 className="w-12 h-12 mx-auto mb-3 text-[var(--foreground-secondary)]/50" />
                      暂无机构数据
                    </td>
                  </tr>
                ) : (
                  filteredOrgs.map((org) => {
                    const sub = org.subscription
                    const subInfo = getSubStatusInfo(sub?.status)
                    return (
                      <tr
                        key={org.id}
                        className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]/30 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <span className="font-medium text-[var(--foreground)]">
                              {org.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="px-2 py-0.5 rounded text-xs"
                            style={{
                              backgroundColor: org.isActive
                                ? "color-mix(in srgb, var(--success) 20%, transparent)"
                                : "color-mix(in srgb, var(--danger) 20%, transparent)",
                              color: org.isActive ? "var(--success)" : "var(--danger)",
                            }}
                          >
                            {org.isActive ? "活跃" : "已停用"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm text-[var(--foreground)]">
                              {sub?.plan?.name || "—"}
                            </span>
                            <span
                              className="px-2 py-0.5 rounded text-xs w-fit"
                              style={{
                                backgroundColor: `color-mix(in srgb, ${subInfo.color} 20%, transparent)`,
                                color: subInfo.color,
                              }}
                            >
                              {subInfo.label}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm font-mono tabular-nums text-[var(--foreground)]">
                            {sub ? `${sub.seatsUsed}/${sub.seatsLimit}` : "—"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--foreground-secondary)]">
                          {new Date(org.createdAt).toLocaleDateString("zh-CN")}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/organizations/${org.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors text-sm"
                          >
                            <Eye className="w-4 h-4" />
                            查看
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </GlowCard>
      </div>

      {showCreateModal && (
        <CreateOrganizationModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  )
}

function CreateOrganizationModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)] backdrop-blur-sm"
      onClick={onClose}
    >
      <GlowCard
        variant="primary"
        intensity="high"
        className="p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[var(--foreground)]">创建机构</h2>
          <button
            onClick={onClose}
            className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-[var(--foreground-secondary)] mb-4">
          将跳转至创建页面填写详细信息。
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] transition-colors"
          >
            取消
          </button>
          <Link
            href="/organizations/new"
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            前往创建
          </Link>
        </div>
      </GlowCard>
    </div>
  )
}
