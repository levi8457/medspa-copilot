"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import Link from "next/link"

const intentOptions = [
  { value: "高意向", label: "高意向" },
  { value: "中等意向", label: "中等意向" },
  { value: "低意向", label: "低意向" },
]

export default function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [customerId, setCustomerId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    wechat: "",
    age: "",
    gender: "",
    source: "",
    status: "",
    notes: "",
    intentLevel: "中等意向",
  })

  useEffect(() => {
    params.then((p) => setCustomerId(p.id))
  }, [params])

  useEffect(() => {
    if (!customerId) return

    const fetchCustomer = async () => {
      try {
        const response = await fetch(`/api/customers/${customerId}`)
        const result = await response.json()

        if (result.success) {
          const c = result.data
          const intentTag = c.tags?.find((t: { dimension: string; value: string }) => t.dimension === "需求意向")
          setFormData({
            name: c.name || "",
            phone: c.phone || "",
            wechat: c.wechat || "",
            age: c.age?.toString() || "",
            gender: c.gender || "",
            source: c.source || "",
            status: c.status || "lead",
            notes: c.notes || "",
            intentLevel: intentTag?.value || "中等意向",
          })
        } else {
          setError("获取客户信息失败")
        }
      } catch {
        setError("获取客户信息失败")
      } finally {
        setIsFetching(false)
      }
    }

    fetchCustomer()
  }, [customerId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || undefined,
          wechat: formData.wechat || undefined,
          age: formData.age ? parseInt(formData.age) : undefined,
          gender: formData.gender || undefined,
          source: formData.source || undefined,
          status: formData.status || undefined,
          notes: formData.notes || undefined,
          tags: [{ dimension: "需求意向", value: formData.intentLevel }],
        }),
      })

      const result = await response.json()

      if (result.success) {
        router.push(`/customers/${customerId}`)
      } else {
        setError(result.error?.message || "保存失败")
      }
    } catch {
      setError("保存失败，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <header className="flex items-center gap-4 mb-8">
        <Link
          href={`/customers/${customerId}`}
          className="flex items-center gap-2 text-[var(--foreground-secondary)] hover:text-[var(--primary)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          返回
        </Link>
        <h1 className="font-mono text-2xl font-bold tracking-wider text-[var(--primary)]">
          编辑客户
        </h1>
      </header>

      <GlowCard variant="primary" className="max-w-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm text-[var(--foreground-secondary)] mb-2">
                姓名 <span className="text-[var(--danger)]">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入客户姓名"
                className="w-full px-4 py-3 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
              />
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm text-[var(--foreground-secondary)] mb-2">手机号</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="请输入手机号"
                maxLength={11}
                className="w-full px-4 py-3 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
              />
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm text-[var(--foreground-secondary)] mb-2">微信号</label>
              <input
                type="text"
                value={formData.wechat}
                onChange={(e) => setFormData({ ...formData, wechat: e.target.value })}
                placeholder="请输入微信号"
                className="w-full px-4 py-3 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
              />
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm text-[var(--foreground-secondary)] mb-2">年龄</label>
              <input
                type="number"
                min="0"
                max="150"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="请输入年龄"
                className="w-full px-4 py-3 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
              />
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm text-[var(--foreground-secondary)] mb-2">性别</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
              >
                <option value="">请选择</option>
                <option value="女">女</option>
                <option value="男">男</option>
              </select>
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm text-[var(--foreground-secondary)] mb-2">来源渠道</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
              >
                <option value="">请选择</option>
                <option value="小红书">小红书</option>
                <option value="抖音">抖音</option>
                <option value="大众点评">大众点评</option>
                <option value="朋友推荐">朋友推荐</option>
                <option value="到店咨询">到店咨询</option>
                <option value="其他">其他</option>
              </select>
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm text-[var(--foreground-secondary)] mb-2">客户状态</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
              >
                <option value="lead">线索</option>
                <option value="contacted">已联系</option>
                <option value="negotiating">洽谈中</option>
                <option value="converted">已成交</option>
                <option value="churned">已流失</option>
              </select>
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm text-[var(--foreground-secondary)] mb-2">意向度</label>
              <select
                value={formData.intentLevel}
                onChange={(e) => setFormData({ ...formData, intentLevel: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
              >
                {intentOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-[var(--foreground-secondary)] mb-2">备注</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="请输入备注信息"
              rows={4}
              className="w-full px-4 py-3 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all resize-none"
            />
          </div>

          <div className="flex justify-end gap-4">
            <Link
              href={`/customers/${customerId}`}
              className="px-6 py-3 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={isLoading || !formData.name}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--background)] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  保存
                </>
              )}
            </button>
          </div>
        </form>
      </GlowCard>
    </div>
  )
}
