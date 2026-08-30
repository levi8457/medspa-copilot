"use client"

import { useEffect, useRef, useState } from "react"
import { Check, ClipboardCheck, Mic, Search, Sparkles, Square, UserRound } from "lucide-react"
import Link from "next/link"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { downsampleToPcm16 } from "@/lib/mobile/realtime-audio"
import { listenForAppState, notifyError, notifySuccess } from "@/lib/mobile/native"

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
type RealtimeASRSession = { url: string; audio: { packetBytes: number } }

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
  const [realtimeState, setRealtimeState] = useState<"idle" | "connecting" | "listening" | "error">("idle")
  const [liveText, setLiveText] = useState("")
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const realtimeRefs = useRef<{ socket: WebSocket | null; stream: MediaStream | null; audioContext: AudioContext | null; source: MediaStreamAudioSourceNode | null; processor: ScriptProcessorNode | null }>({ socket: null, stream: null, audioContext: null, source: null, processor: null })

  useEffect(() => {
    void Promise.all([
      apiFetch<{ tasks: Task[] }>("/api/dashboard/daily").then((data) => setTasks(data.tasks)),
      apiFetch<{ customers: Customer[] }>("/api/customers?pageSize=30").then((data) => setCustomers(data.customers)),
    ]).catch((error: unknown) => setNotice(error instanceof Error ? error.message : "加载失败")).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    return () => {
      const current = realtimeRefs.current
      if (current.socket?.readyState === WebSocket.OPEN) current.socket.send(JSON.stringify({ type: "end" }))
      current.socket?.close()
      current.processor?.disconnect()
      current.source?.disconnect()
      current.stream?.getTracks().forEach((track) => track.stop())
      void current.audioContext?.close()
    }
  }, [])

  useEffect(() => listenForAppState((isActive) => {
    if (!isActive && realtimeRefs.current.socket) {
      stopRealtime()
      setNotice("应用已切到后台，实时转写和麦克风已安全停止。返回后可重新开启。")
    }
  }), [])

  async function updateTask(taskId: string) {
    try {
      await apiFetch(`/api/tasks/${taskId}/status`, { method: "PATCH", body: JSON.stringify({ status: "done" }) })
      setTasks((current) => current.filter((task) => task.id !== taskId))
      setNotice("任务已完成")
      void notifySuccess()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "任务更新失败")
      void notifyError()
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
      void notifySuccess()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "创建会话失败")
      void notifyError()
    }
  }

  async function recordConsent() {
    if (!consultationId) return
    try {
      await apiFetch(`/api/mobile/consultations/${consultationId}/consent`, { method: "POST", body: JSON.stringify({ consented: true }) })
      setHasConsent(true)
      setNotice("已记录客户同意，现在可以保存确认转写并获取建议")
      void notifySuccess()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "记录同意失败")
      void notifyError()
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

  function stopRealtime() {
    const current = realtimeRefs.current
    if (current.socket?.readyState === WebSocket.OPEN) current.socket.send(JSON.stringify({ type: "end" }))
    current.socket?.close()
    current.processor?.disconnect()
    current.source?.disconnect()
    current.stream?.getTracks().forEach((track) => track.stop())
    void current.audioContext?.close()
    realtimeRefs.current = { socket: null, stream: null, audioContext: null, source: null, processor: null }
    setRealtimeState("idle")
    setLiveText("")
  }

  async function saveRealtimeSentence(sessionId: string, sequence: number, text: string, state: "partial" | "confirmed", startedAtMs?: number, endedAtMs?: number) {
    if (state === "partial") {
      setLiveText(text)
      return
    }
    await apiFetch(`/api/mobile/consultations/${sessionId}/transcript`, { method: "POST", body: JSON.stringify({ sequence, text, state, speakerGroup: "unknown", startedAtMs, endedAtMs }) })
    setTranscript(text)
    setTranscriptSequence(sequence + 1)
    setLiveText("")
    const result = await apiFetch<{ suggestions: Suggestion[]; message?: string }>(`/api/mobile/consultations/${sessionId}/suggestions`, { method: "POST", body: JSON.stringify({ triggerText: text }) })
    setSuggestions((current) => [...result.suggestions, ...current].slice(0, 6))
    if (result.message) setNotice(result.message)
  }

  async function startRealtime() {
    if (!consultationId || !hasConsent) return setNotice("请先选择客户并完成录音知情同意")
    if (!navigator.mediaDevices?.getUserMedia) return setNotice("当前浏览器不支持麦克风采集，请使用最新版 Chrome 或 Safari")
    try {
      setRealtimeState("connecting")
      const realtimeSession = await apiFetch<RealtimeASRSession>(`/api/mobile/consultations/${consultationId}/asr-session`, { method: "POST" })
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })
      const audioContext = new AudioContext()
      await audioContext.resume()
      const source = audioContext.createMediaStreamSource(stream)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      const silentGain = audioContext.createGain()
      silentGain.gain.value = 0
      let pendingBytes = new Uint8Array(0)
      const socket = new WebSocket(realtimeSession.url)
      socket.binaryType = "arraybuffer"
      socket.onopen = () => {
        source.connect(processor)
        processor.connect(silentGain)
        silentGain.connect(audioContext.destination)
        setRealtimeState("listening")
        setNotice("实时转写已开启。稳定句子会自动保存并查询机构话术。")
      }
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(String(event.data)) as { code?: number; message?: string; result?: { slice_type?: number; index?: number; voice_text_str?: string; start_time?: number; end_time?: number } }
          if (message.code && message.code !== 0) throw new Error(message.message || "实时转写失败")
          const result = message.result
          if (!result?.voice_text_str || result.index === undefined) return
          const state = result.slice_type === 2 ? "confirmed" : "partial"
          void saveRealtimeSentence(consultationId, result.index, result.voice_text_str, state, result.start_time, result.end_time).catch((error: unknown) => setNotice(error instanceof Error ? error.message : "保存实时转写失败"))
        } catch (error) {
          setRealtimeState("error")
          setNotice(error instanceof Error ? error.message : "实时转写数据异常")
        }
      }
      socket.onerror = () => {
        setRealtimeState("error")
        setNotice("实时转写连接失败，可继续手动记录客户原话")
      }
      socket.onclose = () => {
        if (realtimeRefs.current.socket === socket) setRealtimeState("idle")
      }
      processor.onaudioprocess = (event) => {
        if (socket.readyState !== WebSocket.OPEN) return
        const pcm = new Uint8Array(downsampleToPcm16(event.inputBuffer.getChannelData(0), audioContext.sampleRate))
        const combined = new Uint8Array(pendingBytes.length + pcm.length)
        combined.set(pendingBytes)
        combined.set(pcm, pendingBytes.length)
        let offset = 0
        while (combined.length - offset >= realtimeSession.audio.packetBytes) {
          socket.send(combined.slice(offset, offset + realtimeSession.audio.packetBytes))
          offset += realtimeSession.audio.packetBytes
        }
        pendingBytes = combined.slice(offset)
      }
      realtimeRefs.current = { socket, stream, audioContext, source, processor }
    } catch (error) {
      stopRealtime()
      setRealtimeState("error")
      setNotice(error instanceof Error ? error.message : "无法开启实时转写")
      void notifyError()
    }
  }

  async function finishConsultation() {
    if (!consultationId) return
    try {
      stopRealtime()
      await apiFetch(`/api/mobile/consultations/${consultationId}`, { method: "PATCH", body: JSON.stringify({ status: "completed" }) })
      setConsultationId(null)
      setHasConsent(false)
      setSuggestions([])
      setNotice("现场咨询已结束。已保存的实时转写和话术建议可在会话记录中追溯。")
      void notifySuccess()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "结束会话失败")
      void notifyError()
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
        <Link href="/mobile/account" aria-label="打开我的与隐私" className="rounded-full border border-[var(--primary)]/30 bg-[var(--background-card)] p-3 text-[var(--primary)]"><UserRound size={22} /></Link>
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
          {consultationId && hasConsent && <div className="space-y-3"><div className="rounded-lg border border-[var(--primary)]/20 bg-[var(--background-secondary)] p-3"><p className="text-sm font-medium">实时转写</p><p className="mt-1 text-xs text-[var(--foreground-secondary)]">{realtimeState === "listening" ? "正在聆听，稳定句子会自动保存" : "开启后仅上传音频到本机构配置的腾讯云 ASR"}</p>{liveText && <p className="mt-3 text-sm leading-6 text-[var(--foreground-secondary)]">{liveText}</p>}<button onClick={() => realtimeState === "listening" ? stopRealtime() : void startRealtime()} disabled={realtimeState === "connecting"} className="mt-3 w-full rounded-lg border border-[var(--primary)]/50 py-2 text-sm text-[var(--primary)]">{realtimeState === "listening" ? "停止实时转写" : realtimeState === "connecting" ? "正在连接…" : "开启实时转写"}</button></div><label htmlFor="confirmed-transcript" className="block text-sm font-medium">手动补充或测试客户原话</label><textarea id="confirmed-transcript" value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder="例如：我担心恢复期太长，影响上班。" className="min-h-28 w-full rounded-lg border border-[var(--border)] bg-[var(--background-secondary)] p-3 text-sm text-[var(--foreground)]" /><button onClick={() => void saveTranscriptAndSuggest()} className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--primary)]/50 py-3 text-[var(--primary)]"><Sparkles size={18} />保存并查找机构话术</button>{suggestions.map((suggestion) => <div key={suggestion.id} className="rounded-lg border border-[var(--primary)]/20 bg-[var(--background-secondary)] p-3"><p className="mb-2 text-xs text-[var(--primary)]">{suggestion.reason}</p><p className="whitespace-pre-wrap text-sm leading-6">{suggestion.content}</p></div>)}<button onClick={() => void finishConsultation()} className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--danger)]/40 py-3 text-[var(--danger)]"><Square size={16} />结束现场咨询</button></div>}
        </GlowCard>
      </section>

      <footer className="mt-8 border-t border-[var(--border)] pt-4 text-xs leading-5 text-[var(--foreground-secondary)]"><Search className="mr-1 inline" size={14} />仅展示机构话术库中已审核内容。实时转写必须在客户同意后手动开启，停止、结束会话或进入后台后会立即关闭麦克风。<Link href="/privacy" className="ml-2 text-[var(--primary)]">隐私政策</Link></footer>
    </main>
  )
}
