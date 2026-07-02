"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { motion } from "framer-motion"
import {
  Building2,
  User,
  Phone,
  ShieldCheck,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from "lucide-react"

interface FormState {
  orgName: string
  contactName: string
  phone: string
  code: string
  password: string
  confirmPassword: string
  agreed: boolean
}

const initialState: FormState = {
  orgName: "",
  contactName: "",
  phone: "",
  code: "",
  password: "",
  confirmPassword: "",
  agreed: false,
}

export default function TrialRegisterPage() {
  const router = useRouter()

  const [form, setForm] = useState<FormState>(initialState)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitError, setSubmitError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // 验证码倒计时
  const [countdown, setCountdown] = useState(0)
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // 背景粒子（与登录页保持一致的视觉语言）
  const particles = useMemo(() => {
    return Array.from({ length: 20 }, () => ({
      x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1000),
      y: Math.random() * (typeof window !== "undefined" ? window.innerHeight : 800),
      animY: Math.random() * -500,
      duration: Math.random() * 10 + 10,
    }))
  }, [])

  useEffect(() => {
    return () => {
      if (countdownTimer.current) clearInterval(countdownTimer.current)
    }
  }, [])

  const updateField = (field: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    // 清除该字段错误
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
    // 清除提交错误
    if (submitError) setSubmitError("")
  }

  const handleSendCode = () => {
    if (countdown > 0) return
    // 校验手机号
    if (!/^1[3-9]\d{9}$/.test(form.phone)) {
      setErrors((prev) => ({ ...prev, phone: "请输入有效的手机号" }))
      return
    }
    // 前端仅做倒计时，不真正发送短信
    setCountdown(60)
    countdownTimer.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownTimer.current) clearInterval(countdownTimer.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const validate = (): boolean => {
    const nextErrors: Partial<Record<keyof FormState, string>> = {}

    if (!form.orgName.trim()) {
      nextErrors.orgName = "请输入机构名称"
    } else if (form.orgName.trim().length < 2) {
      nextErrors.orgName = "机构名称至少2个字符"
    }

    if (!form.contactName.trim()) {
      nextErrors.contactName = "请输入联系人姓名"
    } else if (form.contactName.trim().length < 2) {
      nextErrors.contactName = "联系人姓名至少2个字符"
    }

    if (!form.phone) {
      nextErrors.phone = "请输入手机号"
    } else if (!/^1[3-9]\d{9}$/.test(form.phone)) {
      nextErrors.phone = "请输入有效的手机号"
    }

    if (!form.code) {
      nextErrors.code = "请输入短信验证码"
    }

    if (!form.password) {
      nextErrors.password = "请设置密码"
    } else if (form.password.length < 6) {
      nextErrors.password = "密码至少6个字符"
    }

    if (!form.confirmPassword) {
      nextErrors.confirmPassword = "请再次输入密码"
    } else if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = "两次输入的密码不一致"
    }

    if (!form.agreed) {
      nextErrors.agreed = "请阅读并同意服务条款与隐私政策"
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError("")

    if (!validate()) return

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/trial/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName: form.orgName.trim(),
          contactName: form.contactName.trim(),
          phone: form.phone,
          code: form.code,
          password: form.password,
        }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setSubmitError(data?.error?.message || "注册失败，请稍后重试")
        return
      }

      setIsSuccess(true)
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch {
      setSubmitError("网络异常，请稍后重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)] overflow-hidden">
      {/* 背景粒子 + 渐变 */}
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
        className="w-full max-w-md relative z-10"
      >
        <GlowCard variant="primary" className="w-full p-8">
          {/* 标题 */}
          <div className="text-center mb-8">
            <motion.h1
              className="font-mono text-2xl font-bold tracking-wider text-[var(--primary)]"
              animate={{ opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              免费试用 14 天
            </motion.h1>
            <p className="text-[var(--foreground-secondary)] mt-2 text-sm">
              填写以下信息，立即创建您的试用账号
            </p>
          </div>

          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-16 h-16 rounded-full bg-[var(--success)]/10 border border-[var(--success)]/30 flex items-center justify-center mb-4"
              >
                <CheckCircle2 className="w-8 h-8 text-[var(--success)]" />
              </motion.div>
              <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
                账号创建成功
              </h3>
              <p className="text-sm text-[var(--foreground-secondary)]">
                即将跳转到登录页...
              </p>
              <Loader2 className="w-4 h-4 animate-spin text-[var(--primary)] mt-4" />
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {submitError && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)]"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="text-sm">{submitError}</span>
                </motion.div>
              )}

              {/* 机构名称 */}
              <Field
                label="机构名称"
                icon={<Building2 className="w-5 h-5" />}
                error={errors.orgName}
              >
                <input
                  type="text"
                  value={form.orgName}
                  onChange={(e) => updateField("orgName", e.target.value)}
                  placeholder="请输入机构名称"
                  className={inputClass(!!errors.orgName)}
                />
              </Field>

              {/* 联系人姓名 */}
              <Field
                label="联系人姓名"
                icon={<User className="w-5 h-5" />}
                error={errors.contactName}
              >
                <input
                  type="text"
                  value={form.contactName}
                  onChange={(e) => updateField("contactName", e.target.value)}
                  placeholder="请输入联系人姓名"
                  className={inputClass(!!errors.contactName)}
                />
              </Field>

              {/* 手机号 */}
              <Field
                label="手机号"
                icon={<Phone className="w-5 h-5" />}
                error={errors.phone}
              >
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="请输入手机号"
                  maxLength={11}
                  className={inputClass(!!errors.phone)}
                />
              </Field>

              {/* 短信验证码 */}
              <Field
                label="短信验证码"
                icon={<ShieldCheck className="w-5 h-5" />}
                error={errors.code}
              >
                <div className="relative flex items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.code}
                    onChange={(e) => updateField("code", e.target.value)}
                    placeholder="请输入验证码"
                    maxLength={6}
                    className={inputClass(!!errors.code, true)}
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={countdown > 0}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-medium rounded-md text-[var(--primary)] border border-[var(--primary)]/30 bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 hover:border-[var(--primary)]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {countdown > 0 ? `重新获取 ${countdown}s` : "获取验证码"}
                  </button>
                </div>
              </Field>

              {/* 设置密码 */}
              <Field
                label="设置密码"
                icon={<Lock className="w-5 h-5" />}
                error={errors.password}
              >
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="至少6个字符"
                  className={inputClass(!!errors.password)}
                />
              </Field>

              {/* 确认密码 */}
              <Field
                label="确认密码"
                icon={<KeyRound className="w-5 h-5" />}
                error={errors.confirmPassword}
              >
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  placeholder="请再次输入密码"
                  className={inputClass(!!errors.confirmPassword)}
                />
              </Field>

              {/* 服务条款 */}
              <div>
                <label className="flex items-start gap-2 cursor-pointer group">
                  <span className="relative mt-0.5">
                    <input
                      type="checkbox"
                      checked={form.agreed}
                      onChange={(e) => updateField("agreed", e.target.checked)}
                      className="sr-only peer"
                    />
                    <span
                      className={`flex w-4 h-4 rounded border items-center justify-center transition-all ${
                        form.agreed
                          ? "bg-[var(--primary)] border-[var(--primary)]"
                          : "border-[var(--border-hover)] group-hover:border-[var(--primary)]/50"
                      }`}
                    >
                      {form.agreed && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 15 }}
                        >
                          <CheckCircle2 className="w-3 h-3 text-[var(--background)]" />
                        </motion.span>
                      )}
                    </span>
                  </span>
                  <span className="text-sm text-[var(--foreground-secondary)] select-none">
                    同意
                    <span className="text-[var(--primary)] mx-1">《服务条款》</span>
                    和
                    <span className="text-[var(--primary)] mx-1">《隐私政策》</span>
                  </span>
                </label>
                {errors.agreed && (
                  <p className="text-xs text-[var(--danger)] mt-1.5 ml-6">
                    {errors.agreed}
                  </p>
                )}
              </div>

              {/* 提交按钮 */}
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--background)] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    创建中...
                  </>
                ) : (
                  "创建试用账号"
                )}
              </motion.button>
            </form>
          )}
        </GlowCard>
      </motion.div>
    </div>
  )
}

function inputClass(hasError: boolean, withButton = false) {
  return [
    "w-full py-3 rounded-lg bg-[var(--background)]/50 border text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]/50 focus:outline-none focus:ring-1 transition-all",
    withButton ? "pl-10 pr-28" : "pl-10 pr-4",
    hasError
      ? "border-[var(--danger)]/50 focus:border-[var(--danger)] focus:ring-[var(--danger)]"
      : "border-[var(--border)] focus:border-[var(--primary)] focus:ring-[var(--primary)]",
  ].join(" ")
}

function Field({
  label,
  icon,
  error,
  children,
}: {
  label: string
  icon: React.ReactNode
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-[var(--foreground-secondary)]">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-secondary)] pointer-events-none">
          {icon}
        </span>
        {children}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-[var(--danger)] flex items-center gap-1"
        >
          <AlertCircle className="w-3 h-3" />
          {error}
        </motion.p>
      )}
    </div>
  )
}
