"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"

const statusOptions = [
  { value: "lead", label: "线索" },
  { value: "contacted", label: "已联系" },
  { value: "negotiating", label: "洽谈中" },
  { value: "converted", label: "已成交" },
  { value: "churned", label: "已流失" },
]

export default function AdminCustomerNewPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "",
    phone: "",
    wechat: "",
    age: "",
    gender: "",
    source: "",
    status: "lead",
    notes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone || null,
        wechat: form.wechat || null,
        age: form.age ? parseInt(form.age) : null,
        gender: form.gender || null,
        source: form.source || null,
        status: form.status,
        notes: form.notes || null,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      router.push(`/admin/customers/${data.data.id}`)
    } else {
      alert("创建失败")
    }
    setSaving(false)
  }

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/customers"
            className="flex items-center gap-2 text-[var(--foreground-secondary)] hover:text-[var(--primary)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回
          </Link>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">新建客户</h1>
        </div>

        <GlowCard variant="primary" className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-2">姓名 *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-2">手机号</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-2">微信号</label>
                <input
                  type="text"
                  value={form.wechat}
                  onChange={(e) => setForm({ ...form, wechat: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-2">年龄</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-2">性别</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                >
                  <option value="">未设置</option>
                  <option value="女">女</option>
                  <option value="男">男</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-2">来源</label>
                <input
                  type="text"
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  placeholder="如：美团、朋友介绍、到店"
                  className="w-full px-4 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-2">客户状态</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-2">备注</label>
              <textarea
                rows={4}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>

            <div className="flex justify-end gap-4">
              <Link
                href="/admin/customers"
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
                {saving ? "创建中..." : "创建"}
              </button>
            </div>
          </form>
        </GlowCard>
      </div>
    </div>
  )
}
