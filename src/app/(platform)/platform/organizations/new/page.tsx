"use client"

import { apiFetch } from "@/lib/api-fetch"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { ArrowLeft, Save, AlertCircle, RefreshCw } from "lucide-react"

interface Plan {
  id: string
  name: string
  maxSeats: number
  priceMonthly: number
  trialDays: number
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string }
}

export default function CreateOrganizationPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [plansLoading, setPlansLoading] = useState(true)

  const [form, setForm] = useState({
    name: "",
    adminName: "",
    adminPhone: "",
    password: "",
    planId: "",
  })

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await apiFetch("/api/platform/plans")
        const json: ApiResponse<Plan[]> = await res.json()
        if (json.success && json.data) {
          setPlans(json.data)
          if (json.data.length > 0) {
            setForm((prev) => ({ ...prev, planId: json.data![0].id }))
          }
        }
      } catch {
        // 套餐加载失败不阻塞，用户仍可提交
      } finally {
        setPlansLoading(false)
      }
    }
    fetchPlans()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.name.trim() || !form.adminName.trim() || !form.adminPhone.trim() || !form.password.trim()) {
      setError("请填写所有必填字段")
      return
    }

    if (form.password.length < 6) {
      setError("初始密码至少 6 位")
      return
    }

    setSaving(true)
    try {
      const res = await apiFetch("/api/platform/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          adminName: form.adminName.trim(),
          adminPhone: form.adminPhone.trim(),
          adminPassword: form.password,
          planId: form.planId || "",
        }),
      })

      const json: ApiResponse<{ id: string }> = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "创建机构失败")
      }

      router.push("/platform/organizations")
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建机构失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/platform/organizations"
            className="flex items-center gap-2 text-[var(--foreground-secondary)] hover:text-[var(--primary)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回
          </Link>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">创建机构</h1>
        </div>

        <GlowCard variant="primary" className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-[var(--danger)] flex-shrink-0" />
                <p className="text-sm text-[var(--danger)]">{error}</p>
              </div>
            )}

            <div>
              <h2 className="text-sm font-medium text-[var(--foreground-secondary)] mb-4 uppercase tracking-wider">
                机构信息
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-2">
                    机构名称 *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="如：华美医美机构"
                    className="w-full px-4 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-medium text-[var(--foreground-secondary)] mb-4 uppercase tracking-wider">
                管理员账号
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-2">
                    管理员姓名 *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.adminName}
                    onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                    placeholder="管理员真实姓名"
                    className="w-full px-4 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-2">
                    管理员手机号 *
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.adminPhone}
                    onChange={(e) => setForm({ ...form, adminPhone: e.target.value })}
                    placeholder="11 位手机号，作为登录账号"
                    className="w-full px-4 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-2">
                    初始密码 *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="至少 6 位"
                    className="w-full px-4 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-medium text-[var(--foreground-secondary)] mb-4 uppercase tracking-wider">
                套餐选择
              </h2>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-2">
                  选择套餐
                </label>
                {plansLoading ? (
                  <div className="px-4 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground-secondary)] flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    加载套餐...
                  </div>
                ) : plans.length === 0 ? (
                  <div className="px-4 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground-secondary)] text-sm">
                    暂无可用套餐，将使用默认配置
                  </div>
                ) : (
                  <select
                    value={form.planId}
                    onChange={(e) => setForm({ ...form, planId: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
                  >
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}（{plan.maxSeats} 席位 / ¥{plan.priceMonthly}/月 / {plan.trialDays} 天试用）
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-[var(--border)]">
              <Link
                href="/platform/organizations"
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] transition-colors"
              >
                取消
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Save className="w-4 h-4" />
                {saving ? "创建中..." : "创建机构"}
              </button>
            </div>
          </form>
        </GlowCard>
      </div>
    </div>
  )
}
