"use client"

import { useState, Suspense, useMemo } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { motion } from "framer-motion"
import { Phone, Lock, Loader2, AlertCircle } from "lucide-react"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"

  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const particles = useMemo(() => {
    return Array.from({ length: 20 }, () => ({
      x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1000),
      y: Math.random() * (typeof window !== "undefined" ? window.innerHeight : 800),
      animY: Math.random() * -500,
      duration: Math.random() * 10 + 10,
    }))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        phone,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("手机号或密码错误")
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setError("登录失败，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
      {/* 背景粒子效果 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 via-transparent to-[var(--accent)]/5" />
        {particles.map((p, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-[var(--primary)]/30"
            initial={{ x: p.x, y: p.y }}
            animate={{
              y: [null, p.animY],
              opacity: [0.3, 0],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <GlowCard variant="primary" className="w-full max-w-md p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.h1
              className="font-mono text-3xl font-bold tracking-wider text-[var(--primary)]"
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              MedSpa Copilot
            </motion.h1>
            <p className="text-[var(--foreground-secondary)] mt-2">医美 AI 智能管家</p>
          </div>

          {/* 登录表单 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)]"
              >
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}

            <div className="space-y-2">
              <label className="text-sm text-[var(--foreground-secondary)]">手机号</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--foreground-secondary)]" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="请输入手机号"
                  maxLength={11}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--foreground-secondary)]">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--foreground-secondary)]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="请输入密码"
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--background)] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  登录中...
                </>
              ) : (
                "登录"
              )}
            </motion.button>
          </form>

          {/* 底部提示 */}
          <div className="mt-6 text-center text-sm text-[var(--foreground-secondary)]">
            <p className="mb-1">测试账号：</p>
            <p>咨询师：13800000001 / 123456</p>
            <p>管理员：13800000002 / 123456</p>
          </div>
        </GlowCard>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">加载中...</div>}>
      <LoginForm />
    </Suspense>
  )
}
