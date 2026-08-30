"use client"

import Link from "next/link"
import { signOut, useSession } from "next-auth/react"
import { ArrowLeft, LogOut, ShieldCheck, Trash2 } from "lucide-react"
import { useState } from "react"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { notifyError, notifySuccess } from "@/lib/mobile/native"

type DeletionResponse = { ticketId: string; alreadyRequested: boolean }

async function requestDeletion() {
  const response = await fetch("/api/mobile/account/deletion-request", { method: "POST" })
  const payload = await response.json() as { success: boolean; data?: DeletionResponse; error?: { message?: string } }
  if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error?.message ?? "提交失败")
  return payload.data
}

export default function MobileAccountPage() {
  const { data: session } = useSession()
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleDeletion() {
    if (!window.confirm("提交后会冻结此账号的 App 访问权限申请。机构业务记录会按隐私政策和法定要求处理。是否继续？")) return
    try {
      setSubmitting(true)
      const result = await requestDeletion()
      setNotice(result.alreadyRequested ? "删除申请正在处理中，请勿重复提交。" : "删除申请已提交。机构管理员会按数据保留政策处理。")
      void notifySuccess()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "删除申请提交失败")
      void notifyError()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 pb-12 pt-6">
      <Link href="/mobile" className="inline-flex items-center gap-1 text-sm text-[var(--primary)]"><ArrowLeft size={16} />返回工作台</Link>
      <header className="mb-7 mt-5"><p className="font-mono text-xs tracking-[0.2em] text-[var(--primary)]">ACCOUNT & PRIVACY</p><h1 className="mt-2 text-3xl font-semibold">我的与隐私</h1></header>
      {notice && <p role="status" className="mb-4 rounded-lg border border-[var(--primary)]/25 bg-[var(--background-card)] p-3 text-sm text-[var(--foreground-secondary)]">{notice}</p>}
      <div className="space-y-4">
        <GlowCard className="p-4"><p className="text-sm text-[var(--foreground-secondary)]">当前账号</p><p className="mt-1 font-medium">{session?.user.name || session?.user.phone || session?.user.email || "咨询师账号"}</p><p className="mt-1 text-xs text-[var(--foreground-secondary)]">仅显示本人名下的客户、任务与会话记录。</p></GlowCard>
        <GlowCard variant="primary" className="space-y-3 p-4"><div className="flex items-center gap-2"><ShieldCheck className="text-[var(--primary)]" size={19} /><h2 className="font-medium">隐私与录音</h2></div><p className="text-sm leading-6 text-[var(--foreground-secondary)]">录音和实时转写只会在客户明确同意后开启。停止转写、结束会话或应用进入后台时，麦克风会停止采集。</p><Link href="/privacy" className="inline-flex text-sm text-[var(--primary)]">查看隐私政策</Link></GlowCard>
        <GlowCard variant="warning" className="space-y-3 p-4"><div className="flex items-center gap-2"><Trash2 className="text-[var(--warning)]" size={19} /><h2 className="font-medium">申请删除账号</h2></div><p className="text-sm leading-6 text-[var(--foreground-secondary)]">可在此发起删除申请。为保护机构客户档案，已产生的业务记录会按机构的数据保留政策与适用法律处理，不会被静默删除。</p><button type="button" onClick={() => void handleDeletion()} disabled={submitting} className="w-full rounded-lg border border-[var(--warning)]/50 px-4 py-3 text-sm text-[var(--warning)] disabled:opacity-50">{submitting ? "正在提交…" : "提交删除申请"}</button></GlowCard>
        <button type="button" onClick={() => void signOut({ callbackUrl: "/login" })} className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--danger)]/40 px-4 py-3 text-sm text-[var(--danger)]"><LogOut size={17} />退出登录</button>
      </div>
    </main>
  )
}
