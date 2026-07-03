"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  Sparkles,
  FileText,
  RefreshCw,
  Loader2,
  User,
  Phone,
  MessageCircle,
  History,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { TagCapsule } from "@/components/futuristic/TagCapsule"

// ============ 类型定义 ============

interface CustomerInfo {
  id: string
  name: string
  phone: string | null
  wechat: string | null
  age: number | null
  gender: string | null
  status: string
  tier: string | null
}

interface ProfileReport {
  id: string
  version: number
  status: string
  overview: string | null
  decisionStyle: string | null
  communication: string | null
  coreNeeds: string | null
  recommendations: string | null
  riskPoints: string | null
  nextActions: string | null
  fullContent: string
  generatedAt: string
  createdAt: string
}

interface ReportHistoryItem {
  id: string
  version: number
  status: string
  generatedAt: string
  createdAt: string
  overview: string | null
}

interface ProfileReportListResponse {
  total: number
  latest: ProfileReport | null
  history: ReportHistoryItem[]
}

// ============ 维度配置 ============

const dimensionConfig = [
  { key: "overview" as const, title: "基础画像速览", variant: "primary" as const },
  { key: "decisionStyle" as const, title: "决策风格分析", variant: "accent" as const },
  { key: "communication" as const, title: "沟通策略建议", variant: "primary" as const },
  { key: "coreNeeds" as const, title: "核心需求与顾虑点", variant: "warning" as const },
  { key: "recommendations" as const, title: "推荐项目与时机", variant: "success" as const },
  { key: "riskPoints" as const, title: "风险点提示", variant: "danger" as const },
  { key: "nextActions" as const, title: "下一步行动建议", variant: "accent" as const },
]

const statusMap: Record<string, { label: string; color: string }> = {
  lead: { label: "线索", color: "var(--accent)" },
  contacted: { label: "已联系", color: "var(--primary)" },
  negotiating: { label: "洽谈中", color: "var(--warning)" },
  converted: { label: "已成交", color: "var(--success)" },
  churned: { label: "已流失", color: "var(--danger)" },
}

const tierMap: Record<string, { label: string; color: string }> = {
  A: { label: "A类", color: "var(--success)" },
  B: { label: "B类", color: "var(--primary)" },
  C: { label: "C类", color: "var(--warning)" },
  D: { label: "D类", color: "var(--foreground-secondary)" },
}

// ============ 页面组件 ============

export default function ProfileReportPage() {
  const params = useParams<{ id: string }>()
  const customerId = params.id

  const [customer, setCustomer] = useState<CustomerInfo | null>(null)
  const [reportData, setReportData] = useState<ProfileReportListResponse | null>(null)
  const [selectedReport, setSelectedReport] = useState<ProfileReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [streamError, setStreamError] = useState<string | null>(null)

  // 拉取客户信息 + 报告列表
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [customerRes, reportRes] = await Promise.all([
        fetch(`/api/customers/${customerId}`),
        fetch(`/api/customers/${customerId}/profile-report`),
      ])
      const customerResult = await customerRes.json()
      const reportResult = await reportRes.json()

      if (customerResult.success) {
        setCustomer(customerResult.data)
      }
      if (reportResult.success) {
        setReportData(reportResult.data)
        setSelectedReport(reportResult.data.latest ?? null)
      }
    } catch (error) {
      console.error("获取画像报告数据失败:", error)
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // SSE 流式生成新报告
  const handleGenerate = async () => {
    setGenerating(true)
    setStreamingContent("")
    setStreamError(null)

    try {
      const response = await fetch(
        `/api/customers/${customerId}/profile-report/stream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      )

      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(err?.error?.message || "生成失败")
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("无法读取流")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === "chunk") {
              setStreamingContent((prev) => prev + data.content)
            } else if (data.type === "done") {
              // 流结束，重新拉取最新数据
              await fetchData()
            } else if (data.type === "error") {
              setStreamError(data.message || "生成失败")
            }
          } catch {
            // 忽略解析失败的 chunk
          }
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "生成失败"
      setStreamError(msg)
      console.error("生成画像报告失败:", error)
    } finally {
      setGenerating(false)
    }
  }

  // 切换查看历史版本（仅 latest 有完整内容）
  const handleSelectHistory = (item: ReportHistoryItem) => {
    if (reportData?.latest?.id === item.id) {
      setSelectedReport(reportData.latest)
    } else {
      // 历史版本仅有 overview 字段，构造一个部分报告
      setSelectedReport({
        ...item,
        overview: item.overview,
        decisionStyle: null,
        communication: null,
        coreNeeds: null,
        recommendations: null,
        riskPoints: null,
        nextActions: null,
        fullContent: "",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <div className="w-10 h-10 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const statusInfo = customer ? statusMap[customer.status] || statusMap.lead : null
  const tierInfo = customer?.tier ? tierMap[customer.tier] : null

  return (
    <div className="p-8">
      {/* 顶部导航 + 标题 */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href={`/customers/${customerId}`}
            className="flex items-center gap-2 text-[var(--foreground-secondary)] hover:text-[var(--primary)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回客户详情
          </Link>
          <h1 className="font-mono text-2xl font-bold tracking-wider text-[var(--primary)] flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[var(--accent)]" />
            客户画像报告
          </h1>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--background)] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              生成中...
            </>
            ) : (
            <>
              <Sparkles className="w-4 h-4" />
              生成新报告
            </>
          )}
        </button>
      </header>

      {/* 客户基本信息摘要 */}
      {customer && (
        <GlowCard variant="primary" className="p-5 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
                <User className="w-6 h-6 text-[var(--primary)]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-[var(--foreground)]">{customer.name}</span>
                  {statusInfo && (
                    <span
                      className="px-2 py-0.5 rounded text-xs"
                      style={{
                        backgroundColor: `${statusInfo.color}20`,
                        color: statusInfo.color,
                      }}
                    >
                      {statusInfo.label}
                    </span>
                  )}
                  {tierInfo && (
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `${tierInfo.color}20`,
                        color: tierInfo.color,
                      }}
                    >
                      {tierInfo.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-[var(--foreground-secondary)] mt-1">
                  {customer.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {customer.phone}
                    </span>
                  )}
                  {customer.wechat && (
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {customer.wechat}
                    </span>
                  )}
                  {customer.age && <span>{customer.age}岁</span>}
                  {customer.gender && <span>{customer.gender}</span>}
                </div>
              </div>
            </div>
          </div>
        </GlowCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 主体：报告内容 */}
        <div className="lg:col-span-3 space-y-4">
          {/* 流式生成中：打字机效果 */}
          <AnimatePresence>
            {generating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <GlowCard variant="accent" className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      AI 正在生成深度画像...
                    </span>
                  </div>
                  <div className="p-4 rounded-lg bg-[var(--background)]/80 border border-[var(--border)] max-h-96 overflow-auto">
                    <pre className="text-sm text-[var(--foreground-secondary)] whitespace-pre-wrap font-mono leading-relaxed">
                      {streamingContent || "等待响应..."}
                      <span className="inline-block w-0.5 h-4 bg-[var(--accent)] animate-pulse ml-0.5 align-middle" />
                    </pre>
                  </div>
                </GlowCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 流式错误提示 */}
          {streamError && (
            <GlowCard variant="danger" className="p-4">
              <div className="flex items-center gap-2 text-[var(--danger)]">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">生成失败：{streamError}</span>
              </div>
            </GlowCard>
          )}

          {/* 报告内容 */}
          {!generating && selectedReport ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[var(--primary)]" />
                  <span className="text-lg font-medium text-[var(--foreground)]">
                    报告 v{selectedReport.version}
                  </span>
                  <span className="text-sm text-[var(--foreground-secondary)]">
                    {new Date(selectedReport.generatedAt).toLocaleString("zh-CN")}
                  </span>
                </div>
                <TagCapsule
                  label={selectedReport.status === "completed" ? "已完成" : selectedReport.status}
                  variant={selectedReport.status === "completed" ? "success" : "warning"}
                  size="sm"
                />
              </div>

              {/* 7 维度分卡片展示 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dimensionConfig.map((dim, idx) => {
                  const content = selectedReport[dim.key]
                  const isLatestFull =
                    reportData?.latest?.id === selectedReport.id || dim.key === "overview"
                  return (
                    <motion.div
                      key={dim.key}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04, duration: 0.3 }}
                      className={dim.key === "overview" || dim.key === "nextActions" ? "md:col-span-2" : ""}
                    >
                      <GlowCard variant={dim.variant} className="p-5 h-full">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--foreground-secondary)] mb-3">
                          {dim.title}
                        </h3>
                        {content ? (
                          <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">
                            {content}
                          </p>
                        ) : (
                          <p className="text-sm text-[var(--foreground-muted)] italic">
                            {isLatestFull
                              ? "暂无内容"
                              : "历史版本仅保留基础画像，完整内容请查看最新版本"}
                          </p>
                        )}
                      </GlowCard>
                    </motion.div>
                  )
                })}
              </div>
            </>
          ) : (
            !generating && (
              <GlowCard variant="accent" className="p-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-[var(--accent)] opacity-50" />
                <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
                  暂无画像报告
                </h3>
                <p className="text-[var(--foreground-secondary)] text-sm mb-4">
                  点击右上角"生成新报告"，AI 将基于客户标签、互动、消费等数据生成 7 维度深度画像
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/30 transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  立即生成
                </button>
              </GlowCard>
            )
          )}
        </div>

        {/* 右侧：历史报告列表 */}
        <div className="lg:col-span-1">
          <GlowCard variant="primary" className="p-5 sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-[var(--primary)]" />
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                历史报告 ({reportData?.total ?? 0})
              </h3>
            </div>

            {reportData && reportData.history.length > 0 ? (
              <div className="space-y-2 max-h-[600px] overflow-auto pr-1">
                {reportData.history.map((item) => {
                  const isActive = selectedReport?.id === item.id
                  const isLatest = reportData.latest?.id === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectHistory(item)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isActive
                          ? "bg-[var(--primary)]/10 border-[var(--primary)]/40"
                          : "bg-[var(--background)]/50 border-[var(--border)] hover:border-[var(--primary)]/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[var(--foreground)]">
                          v{item.version}
                        </span>
                        {isLatest && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--success)]/20 text-[var(--success)]">
                            最新
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--foreground-secondary)]">
                        {new Date(item.generatedAt).toLocaleString("zh-CN")}
                      </p>
                      {item.overview && (
                        <p className="text-xs text-[var(--foreground-muted)] mt-1 line-clamp-2">
                          {item.overview}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-[var(--foreground-secondary)] text-center py-8">
                暂无历史报告
              </p>
            )}

            <button
              onClick={fetchData}
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 px-3 py-2 text-xs text-[var(--foreground-secondary)] hover:text-[var(--primary)] border border-[var(--border)] rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              刷新列表
            </button>
          </GlowCard>
        </div>
      </div>
    </div>
  )
}
