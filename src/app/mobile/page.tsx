"use client"

import { useEffect, useState } from "react"
import { Check, ClipboardCheck, Mic, Search, Sparkles, Square, UserRound } from "lucide-react"
import { GlowCard } from "@/components/futuristic/GlowCard"

type Task = {
  id: string
  customerId: string
  customerName: string
  objective: string | null
  planTitle: string | null
  priority: number
  status: string
}

type Customer = { id: string; name: string; phone: string | null; status: string; tags: { dimension: string; value: string }[] }
type Suggestion = { id: string; content: string; sourceType: string; reason: string }

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } })
  const payload = await response.json() as { success: boolean; data?: T; error?: { message?: string } }
  if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? "请求失败")
  return payload.data as T
}

export default function ConsultantMobilePage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [consultationId, setConsultationId] = useState<string | null>(null)
  const [hasConsent, setHasConsent] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [transcriptSequence, setTranscriptSequence] = useState(0)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void Promise.all([
      apiFetch<{ tasks: Task[] }>("/api/dashboard/daily").then((data) => setTasks(data.tasks)),
      apiFetch<{ customers: Customer[] }>("/api/customers?pageSize=30").then((data) => setCustomers(data.customers)),
    ]).catch((error: unknown) => setNotice(error instanceof Error ? error.message : "加载失败")).finally(() => setLoading(false))
  }, [])

  async function updateTask(taskId: string) {
    try {
      await apiFetch(`/api/tasks/${taskId}/status`, { method: "PATCH", body: JSON.stringify({ status: "done" }) })
      setTasks((current) => current.filter((task) => task.id !== taskId))
      setNotice("任务已完成")
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "任务更新失败")
    }
  }

  async function startConsultation() {
    if (!selectedCustomer) return setNotice("请先选择客户")
    try {
      const consultation = await apiFetch<{ id: string }>("/api/mobile/consultations", { method: "POST", body: JSON.stringify({ customerId: selectedCustomer.id }) })
      setConsultationId(consultation.id)
      setHasConsent(false)
      setTranscript("")
      setTranscriptSequence(0)
      setSuggestions([])
      setNotice("请先完成客户录音知情同意")
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "创建会话失败")
    }
  }

  async function recordConsent() {
    if (!consultationId) return
    try {
      await apiFetch(`/api/mobile/consultations/${consultationId}/consent`, { method: "POST", body: JSON.stringify({ consented: true }) })
      setHasConsent(true)
      setNotice("已记录客户同意，现在可以保存确认转写并获取建议")
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "记录同意失败")
    }
  }

  async function saveTranscriptAndSuggest() {
    if (!consultationId || !transcript.trim()) return setNotice("请输入一段确认后的客户原话")
    try {
      await apiFetch(`/api/mobile/consultations/${consultationId}/transcript`, { method: "POST", body: JSON.stringify({ sequence: transcriptSequence, text: transcript, state: "confirmed", speakerGroup: "unknown" }) })
      const result = await apiFetch<{ suggestions: Suggestion[]; message?: string }>(`/api/mobile/consultations/${consultationId}/suggestions`, { method: "POST", body: JSON.stringify({ triggerText: transcript }) })
      setTranscriptSequence((current) => current + 1)
      setSuggestions(result.suggestions)
      setNotice(result.message ?? "已根据机构话术库生成建议")
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "保存转写失败")
    }
  }

  async function finishConsultation() {
    if (!consultationId) return
    try {
      await apiFetch(`/api/mobile/consultations/${consultationId}`, { method: "PATCH", body: JSON.stringify({ status: "completed" }) })
      setConsultationId(null)
      setHasConsent(false)
      setSuggestions([])
      setNotice("现场咨询已结束。录音上传和实时 ASR 接入将在下一阶段开放。")
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "结束会话失败")
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-[radial-gradient(circle_at_top,var(--primary-dim),transparent_45%)] px-4 pb-24 pt-6">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-[var(--primary)]">CONSULTANT APP / P0</p>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">今天，先做好一件事</h1>
          <p className="mt-1 text-sm text-[var(--foreground-secondary)]">任务、现场记录与机构话术，都在这里。</p>
        </div>
        <div className="rounded-full border border-[var(--primary)]/30 bg-[var(--background-card)] p-3 text-[var(--primary)]"><UserRound size={22} /></div>
      </header>

      {notice && <div role="status" className="mb-4 rounded-lg border border-[var(--primary)]/25 bg-[var(--background-card)] px-3 py-2 text-sm text-[var(--foreground-secondary)]">{notice}</div>}

      <section className="space-y-3" aria-labelledby="today-tasks">
        <div className="flex items-center justify-between"><h2 id="today-tasks" className="text-lg font-semibold">今日任务</h2><span className="font-mono text-sm text-[var(--primary)]">{tasks.length}</span></div>
        {loading && <GlowCard className="p-4 text-sm text-[var(--foreground-secondary)]">正在加载你的任务…</GlowCard>}
        {!loading && tasks.slice(0, 5).map((task) => <GlowCard key={task.id} variant={task.priority <= 1 ? "warning" : "primary"} className="p-4">
          <div className="flex gap-3"><ClipboardCheck className="mt-0.5 shrink-0 text-[var(--primary)]" size={20} /><div className="min-w-0 flex-1"><p className="font-medium">{task.customerName}</p><p className="mt-1 text-sm text-[var(--foreground-secondary)]">{task.objective || task.planTitle || "完成本次跟进"}</p></div><button onClick={() => void updateTask(task.id)} className="rounded-lg border border-[var(--success)]/40 px-2 text-[var(--success)]" aria-label={`完成${task.customerName}的任务`}><Check size={18} /></button></div>
        </GlowCard>)}
        {!loading && tasks.length === 0 && <GlowCard variant="success" className="p-4 text-sm text-[var(--foreground-secondary)]">今天没有待处理任务，保持这个节奏。</GlowCard>}
      </section>

      <section className="mt-8" aria-labelledby="on-site-assistant">
        <div className="mb-3 flex items-center gap-2"><Mic className="text-[var(--accent)]" size={20} /><h2 id="on-site-assistant" className="text-lg font-semibold">现场咨询辅助</h2></div>
        <GlowCard variant="accent" className="space-y-4 p-4">
          <label className="block text-sm font-medium" htmlFor="mobile-customer">选择本人客户</label>
          <select id="mobile-customer" value={selectedCustomer?.id ?? ""} onChange={(event) => setSelectedCustomer(customers.find((customer) => customer.id === event.target.value) ?? null)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--background-secondary)] p-3 text-[var(--foreground)]">
            <option value="">请选择客户</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone.slice(-4)}` : ""}</option>)}
          </select>
          {selectedCustomer && <p className="text-xs text-[var(--foreground-secondary)]">客户标签：{selectedCustomer.tags.slice(0, 4).map((tag) => tag.value).join("、") || "暂无"}</p>}
          {!consultationId && <button onClick={() => void startConsultation()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-3 font-medium text-white"><Mic size={18} />开始现场咨询</button>}
          {consultationId && !hasConsent && <div className="space-y-3 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/5 p-3"><p className="text-sm leading-6">开始前请确认：客户已知晓录音和 AI 转写用途，并同意本次记录。未同意时请停止，不要录音或输入转写。</p><button onClick={() => void recordConsent()} className="w-full rounded-lg border border-[var(--warning)]/50 py-2 text-sm text-[var(--warning)]">我已确认客户同意</button></div>}
          {consultationId && hasConsent && <div className="space-y-3"><label htmlFor="confirmed-transcript" className="block text-sm font-medium">确认后的客户原话</label><textarea id="confirmed-transcript" value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder="例如：我担心恢复期太长，影响上班。" className="min-h-28 w-full rounded-lg border border-[var(--border)] bg-[var(--background-secondary)] p-3 text-sm text-[var(--foreground)]" /><button onClick={() => void saveTranscriptAndSuggest()} className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--primary)]/50 py-3 text-[var(--primary)]"><Sparkles size={18} />保存并查找机构话术</button>{suggestions.map((suggestion) => <div key={suggestion.id} className="rounded-lg border border-[var(--primary)]/20 bg-[var(--background-secondary)] p-3"><p className="mb-2 text-xs text-[var(--primary)]">{suggestion.reason}</p><p className="whitespace-pre-wrap text-sm leading-6">{suggestion.content}</p></div>)}<button onClick={() => void finishConsultation()} className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--danger)]/40 py-3 text-[var(--danger)]"><Square size={16} />结束现场咨询</button></div>}
        </GlowCard>
      </section>

      <footer className="mt-8 border-t border-[var(--border)] pt-4 text-xs leading-5 text-[var(--foreground-secondary)]"><Search className="mr-1 inline" size={14} />P0 仅展示机构话术库中已审核内容。麦克风实时转写尚未开放，不会在此页面后台录音。</footer>
    </main>
  )
}
