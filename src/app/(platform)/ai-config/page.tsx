"use client"

import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GlowCard } from "@/components/futuristic/GlowCard"
import {
  AlertCircle,
  Brain,
  FileText,
  ShieldAlert,
  Mic,
  BarChart3,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Edit3,
  X,
  Eye,
  EyeOff,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"

type TabType = "model" | "prompt" | "compliance" | "asr" | "logs"

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string }
}

interface AIConfigItem {
  id: string
  scope: string
  orgId: string | null
  key: string
  value: string
  description: string | null
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

interface PromptVersionItem {
  id: string
  promptType: string
  version: string
  content: string
  changeLog: string | null
  status: string
  createdBy: string | null
  createdAt: string
}

interface PromptGroup {
  promptType: string
  active: PromptVersionItem | null
  versions: PromptVersionItem[]
}

interface ComplianceWord {
  id: string
  scope: string
  orgId: string | null
  category: string
  word: string
  replacement: string | null
  severity: string
  createdAt: string
}

interface AICallLog {
  id: string
  orgId: string | null
  userId: string | null
  provider: string
  model: string | null
  callType: string
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
  durationMs: number | null
  success: boolean
  errorMessage: string | null
  createdAt: string
}

interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

const inputClass =
  "w-full px-4 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"

const labelClass =
  "block text-sm font-medium text-[var(--foreground-secondary)] mb-2"

const tabButtonClass = (active: boolean) =>
  `flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
    active
      ? "bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30"
      : "text-[var(--foreground-secondary)] hover:bg-[var(--border)]/50 hover:text-[var(--foreground)] border border-transparent"
  }`

const maskApiKey = (key: string): string => {
  if (!key || key.length <= 8) return "****"
  return `${key.slice(0, 4)}****${key.slice(-4)}`
}

const promptTypeLabels: Record<string, string> = {
  tag_extraction: "标签提取",
  strategy: "策略生成",
  script: "话术生成",
  compliance: "合规检查",
  health: "健康评分",
  profile: "画像报告",
}

const categoryLabels: Record<string, string> = {
  prohibited_promise: "违禁承诺",
  medical_term: "医疗术语",
  absolute_language: "绝对化用语",
  false_publicity: "虚假宣传",
  custom: "自定义",
}

const severityLabels: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
}

const severityColors: Record<string, string> = {
  low: "var(--success)",
  medium: "var(--warning)",
  high: "var(--danger)",
}

const providerLabels: Record<string, string> = {
  deepseek: "DeepSeek",
  aliyun_asr: "阿里云 ASR",
  tencent_asr: "腾讯云 ASR",
}

const callTypeLabels: Record<string, string> = {
  chat: "对话",
  asr: "语音识别",
  reasoner: "推理",
}

const tabs = [
  { id: "model" as TabType, name: "模型配置", icon: Brain },
  { id: "prompt" as TabType, name: "Prompt 版本", icon: FileText },
  { id: "compliance" as TabType, name: "合规词库", icon: ShieldAlert },
  { id: "asr" as TabType, name: "ASR 配置", icon: Mic },
  { id: "logs" as TabType, name: "调用日志", icon: BarChart3 },
]

export default function AIConfigPage() {
  const [activeTab, setActiveTab] = useState<TabType>("model")

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">AI 配置管理</h1>
          <p className="text-[var(--foreground-secondary)] mt-1">
            全局 AI 模型、提示词、合规词库及调用日志管理
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={tabButtonClass(activeTab === tab.id)}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {activeTab === "model" && <ModelConfigTab />}
            {activeTab === "prompt" && <PromptVersionTab />}
            {activeTab === "compliance" && <ComplianceWordTab />}
            {activeTab === "asr" && <ASRConfigTab />}
            {activeTab === "logs" && <CallLogsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function ErrorBanner({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <div className="p-4 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 flex items-center gap-3">
      <AlertCircle className="w-5 h-5 text-[var(--danger)] flex-shrink-0" />
      <p className="text-sm text-[var(--danger)]">{error}</p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="py-16 text-center text-[var(--foreground-secondary)]">
      <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
      加载中...
    </div>
  )
}

function ModelConfigTab() {
  const [configs, setConfigs] = useState<AIConfigItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingKeys, setEditingKeys] = useState<Set<string>>(new Set())
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())

  const modelConfigKeys = [
    "deepseek_api_key",
    "deepseek_model",
    "deepseek_base_url",
    "daily_call_limit",
    "compliance_threshold",
  ]

  const configLabels: Record<string, string> = {
    deepseek_api_key: "DeepSeek API Key",
    deepseek_model: "默认模型",
    deepseek_base_url: "API 地址",
    daily_call_limit: "每日调用上限",
    compliance_threshold: "合规阈值",
  }

  const configDescriptions: Record<string, string> = {
    deepseek_api_key: "DeepSeek 大模型 API 密钥",
    deepseek_model: "默认使用的模型名称，如 deepseek-chat",
    deepseek_base_url: "API 基础地址，默认 https://api.deepseek.com",
    daily_call_limit: "全局每日 AI 调用次数限制",
    compliance_threshold: "合规检查触发阈值 (0-1)",
  }

  const isSensitiveKey = (key: string) => key.includes("api_key") || key.includes("secret")

  const fetchConfigs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/platform/ai-config")
      const json: ApiResponse<AIConfigItem[]> = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "获取配置失败")
      }
      setConfigs(json.data || [])
      const values: Record<string, string> = {}
      ;(json.data || []).forEach((c) => {
        values[c.key] = c.value
      })
      setEditValues(values)
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取配置失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfigs()
  }, [fetchConfigs])

  const handleEdit = (key: string) => {
    setEditingKeys((prev) => new Set(prev).add(key))
  }

  const handleCancel = (key: string) => {
    setEditingKeys((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
    const config = configs.find((c) => c.key === key)
    if (config) {
      setEditValues((prev) => ({ ...prev, [key]: config.value }))
    }
  }

  const handleToggleVisible = (key: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleSave = async () => {
    if (editingKeys.size === 0) return
    setSaving(true)
    setError(null)
    try {
      const items = Array.from(editingKeys).map((key) => ({
        key,
        value: editValues[key] || "",
      }))
      const res = await fetch("/api/platform/ai-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      })
      const json: ApiResponse<AIConfigItem[]> = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "保存配置失败")
      }
      setEditingKeys(new Set())
      await fetchConfigs()
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存配置失败")
    } finally {
      setSaving(false)
    }
  }

  const displayConfigs = modelConfigKeys.map((key) => {
    const existing = configs.find((c) => c.key === key)
    return (
      existing || {
        id: key,
        scope: "global",
        orgId: null,
        key,
        value: "",
        description: configDescriptions[key] || null,
        updatedBy: null,
        createdAt: "",
        updatedAt: "",
      }
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">模型配置</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchConfigs}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            刷新
          </button>
          {editingKeys.size > 0 && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              保存修改 ({editingKeys.size})
            </button>
          )}
        </div>
      </div>

      <ErrorBanner error={error} />

      {loading ? (
        <GlowCard variant="primary" className="p-8">
          <LoadingState />
        </GlowCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {displayConfigs.map((config) => {
            const isEditing = editingKeys.has(config.key)
            const isVisible = visibleKeys.has(config.key)
            const sensitive = isSensitiveKey(config.key)

            return (
              <GlowCard key={config.key} variant="primary" className="p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-[var(--foreground)]">
                      {configLabels[config.key] || config.key}
                    </h3>
                    <p className="text-xs text-[var(--foreground-secondary)] mt-1">
                      {configDescriptions[config.key] || config.key}
                    </p>
                  </div>
                  {!isEditing ? (
                    <button
                      onClick={() => handleEdit(config.key)}
                      className="p-2 rounded-lg text-[var(--foreground-secondary)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-colors flex-shrink-0"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCancel(config.key)}
                      className="p-2 rounded-lg text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="relative">
                    <input
                      type={sensitive && !isVisible ? "password" : "text"}
                      value={editValues[config.key] || ""}
                      onChange={(e) =>
                        setEditValues((prev) => ({ ...prev, [config.key]: e.target.value }))
                      }
                      className={`${inputClass} pr-10 font-mono text-sm`}
                      placeholder={`请输入${configLabels[config.key] || config.key}`}
                    />
                    {sensitive && (
                      <button
                        type="button"
                        onClick={() => handleToggleVisible(config.key)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
                      >
                        {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] font-mono text-sm text-[var(--foreground)] truncate">
                      {sensitive && config.value ? maskApiKey(config.value) : config.value || "未配置"}
                    </code>
                    {sensitive && config.value && (
                      <button
                        onClick={() => handleToggleVisible(config.key)}
                        className="p-2 rounded-lg text-[var(--foreground-secondary)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-colors flex-shrink-0"
                      >
                        {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                )}
              </GlowCard>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ASRConfigTab() {
  const [configs, setConfigs] = useState<AIConfigItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingKeys, setEditingKeys] = useState<Set<string>>(new Set())
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())

  const asrConfigKeys = [
    "asr_provider",
    "aliyun_asr_app_key",
    "aliyun_asr_access_key_id",
    "aliyun_asr_access_key_secret",
    "tencent_asr_secret_id",
    "tencent_asr_secret_key",
  ]

  const configLabels: Record<string, string> = {
    asr_provider: "ASR 服务商",
    aliyun_asr_app_key: "阿里云 App Key",
    aliyun_asr_access_key_id: "阿里云 AccessKey ID",
    aliyun_asr_access_key_secret: "阿里云 AccessKey Secret",
    tencent_asr_secret_id: "腾讯云 SecretId",
    tencent_asr_secret_key: "腾讯云 SecretKey",
  }

  const configDescriptions: Record<string, string> = {
    asr_provider: "语音识别服务商：aliyun_asr / tencent_asr",
    aliyun_asr_app_key: "阿里云智能语音交互 App Key",
    aliyun_asr_access_key_id: "阿里云 AccessKey ID",
    aliyun_asr_access_key_secret: "阿里云 AccessKey Secret",
    tencent_asr_secret_id: "腾讯云 SecretId",
    tencent_asr_secret_key: "腾讯云 SecretKey",
  }

  const isSensitiveKey = (key: string) =>
    key.includes("secret") || key.includes("api_key") || key.includes("access_key")

  const fetchConfigs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/platform/ai-config")
      const json: ApiResponse<AIConfigItem[]> = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "获取配置失败")
      }
      setConfigs(json.data || [])
      const values: Record<string, string> = {}
      ;(json.data || []).forEach((c) => {
        values[c.key] = c.value
      })
      setEditValues(values)
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取配置失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfigs()
  }, [fetchConfigs])

  const handleEdit = (key: string) => {
    setEditingKeys((prev) => new Set(prev).add(key))
  }

  const handleCancel = (key: string) => {
    setEditingKeys((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
    const config = configs.find((c) => c.key === key)
    if (config) {
      setEditValues((prev) => ({ ...prev, [key]: config.value }))
    }
  }

  const handleToggleVisible = (key: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleSave = async () => {
    if (editingKeys.size === 0) return
    setSaving(true)
    setError(null)
    try {
      const items = Array.from(editingKeys).map((key) => ({
        key,
        value: editValues[key] || "",
      }))
      const res = await fetch("/api/platform/ai-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      })
      const json: ApiResponse<AIConfigItem[]> = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "保存配置失败")
      }
      setEditingKeys(new Set())
      await fetchConfigs()
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存配置失败")
    } finally {
      setSaving(false)
    }
  }

  const displayConfigs = asrConfigKeys.map((key) => {
    const existing = configs.find((c) => c.key === key)
    return (
      existing || {
        id: key,
        scope: "global",
        orgId: null,
        key,
        value: "",
        description: configDescriptions[key] || null,
        updatedBy: null,
        createdAt: "",
        updatedAt: "",
      }
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">ASR 配置</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchConfigs}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            刷新
          </button>
          {editingKeys.size > 0 && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              保存修改 ({editingKeys.size})
            </button>
          )}
        </div>
      </div>

      <ErrorBanner error={error} />

      {loading ? (
        <GlowCard variant="accent" className="p-8">
          <LoadingState />
        </GlowCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {displayConfigs.map((config) => {
            const isEditing = editingKeys.has(config.key)
            const isVisible = visibleKeys.has(config.key)
            const sensitive = isSensitiveKey(config.key)

            return (
              <GlowCard key={config.key} variant="accent" className="p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-[var(--foreground)]">
                      {configLabels[config.key] || config.key}
                    </h3>
                    <p className="text-xs text-[var(--foreground-secondary)] mt-1">
                      {configDescriptions[config.key] || config.key}
                    </p>
                  </div>
                  {!isEditing ? (
                    <button
                      onClick={() => handleEdit(config.key)}
                      className="p-2 rounded-lg text-[var(--foreground-secondary)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-colors flex-shrink-0"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCancel(config.key)}
                      className="p-2 rounded-lg text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="relative">
                    <input
                      type={sensitive && !isVisible ? "password" : "text"}
                      value={editValues[config.key] || ""}
                      onChange={(e) =>
                        setEditValues((prev) => ({ ...prev, [config.key]: e.target.value }))
                      }
                      className={`${inputClass} pr-10 font-mono text-sm`}
                      placeholder={`请输入${configLabels[config.key] || config.key}`}
                    />
                    {sensitive && (
                      <button
                        type="button"
                        onClick={() => handleToggleVisible(config.key)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
                      >
                        {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] font-mono text-sm text-[var(--foreground)] truncate">
                      {sensitive && config.value ? maskApiKey(config.value) : config.value || "未配置"}
                    </code>
                    {sensitive && config.value && (
                      <button
                        onClick={() => handleToggleVisible(config.key)}
                        className="p-2 rounded-lg text-[var(--foreground-secondary)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-colors flex-shrink-0"
                      >
                        {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                )}
              </GlowCard>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PromptVersionTab() {
  const [groups, setGroups] = useState<PromptGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedType, setSelectedType] = useState<string>("tag_extraction")
  const [viewingPrompt, setViewingPrompt] = useState<PromptVersionItem | null>(null)

  const fetchPrompts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/platform/ai-config/prompts")
      const json: ApiResponse<PromptGroup[]> = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "获取提示词失败")
      }
      setGroups(json.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取提示词失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPrompts()
  }, [fetchPrompts])

  const handleCreateSubmit = async (data: {
    promptType: string
    version: string
    content: string
    changeLog: string
  }) => {
    const res = await fetch("/api/platform/ai-config/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json: ApiResponse<PromptVersionItem> = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || "创建提示词失败")
    }
    await fetchPrompts()
    setShowForm(false)
  }

  const handleActivate = async (prompt: PromptVersionItem) => {
    if (!window.confirm(`确定要激活版本 ${prompt.version} 吗？同类型其他激活版本将被归档。`)) {
      return
    }
    try {
      const res = await fetch(`/api/platform/ai-config/prompts/${prompt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      })
      const json: ApiResponse<PromptVersionItem> = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "激活失败")
      }
      await fetchPrompts()
    } catch (err) {
      setError(err instanceof Error ? err.message : "激活失败")
    }
  }

  const handleDelete = async (prompt: PromptVersionItem) => {
    if (!window.confirm(`确定要删除版本 ${prompt.version} 吗？仅草稿状态可删除。`)) {
      return
    }
    try {
      const res = await fetch(`/api/platform/ai-config/prompts/${prompt.id}`, {
        method: "DELETE",
      })
      const json: ApiResponse<{ id: string }> = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "删除失败")
      }
      await fetchPrompts()
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Prompt 版本管理</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPrompts}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            刷新
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            新建版本
          </button>
        </div>
      </div>

      <ErrorBanner error={error} />

      {showForm && (
        <PromptForm
          initialType={selectedType}
          onSubmit={handleCreateSubmit}
          onClose={() => setShowForm(false)}
          onError={(msg) => setError(msg)}
        />
      )}

      {viewingPrompt && (
        <PromptViewer prompt={viewingPrompt} onClose={() => setViewingPrompt(null)} />
      )}

      {loading ? (
        <GlowCard variant="primary" className="p-8">
          <LoadingState />
        </GlowCard>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <GlowCard key={group.promptType} variant="primary" className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
                    {promptTypeLabels[group.promptType] || group.promptType}
                    {group.active && (
                      <span className="px-2 py-0.5 rounded text-xs bg-[var(--success)]/20 text-[var(--success)]">
                        当前激活 v{group.active.version}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-[var(--foreground-secondary)] mt-1">
                    共 {group.versions.length} 个版本
                  </p>
                </div>
              </div>

              {group.versions.length === 0 ? (
                <p className="text-sm text-[var(--foreground-secondary)]/60 py-4 text-center">
                  暂无版本
                </p>
              ) : (
                <div className="space-y-2">
                  {group.versions.map((prompt) => (
                    <div
                      key={prompt.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-[var(--background)]/30 border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="px-2 py-1 rounded font-mono text-xs bg-[var(--primary)]/10 text-[var(--primary)] flex-shrink-0">
                          v{prompt.version}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-[var(--foreground)] truncate">
                            {prompt.changeLog || "无更新说明"}
                          </p>
                          <p className="text-xs text-[var(--foreground-secondary)]">
                            {new Date(prompt.createdAt).toLocaleString("zh-CN")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className="px-2 py-0.5 rounded text-xs"
                          style={{
                            backgroundColor:
                              prompt.status === "active"
                                ? "color-mix(in srgb, var(--success) 20%, transparent)"
                                : prompt.status === "draft"
                                ? "color-mix(in srgb, var(--warning) 20%, transparent)"
                                : "color-mix(in srgb, var(--foreground-secondary) 20%, transparent)",
                            color:
                              prompt.status === "active"
                                ? "var(--success)"
                                : prompt.status === "draft"
                                ? "var(--warning)"
                                : "var(--foreground-secondary)",
                          }}
                        >
                          {prompt.status === "active" ? "已激活" : prompt.status === "draft" ? "草稿" : "已归档"}
                        </span>
                        <button
                          onClick={() => setViewingPrompt(prompt)}
                          className="p-1.5 rounded text-[var(--foreground-secondary)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {prompt.status === "draft" && (
                          <>
                            <button
                              onClick={() => handleActivate(prompt)}
                              className="p-1.5 rounded text-[var(--success)] hover:bg-[var(--success)]/10 transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(prompt)}
                              className="p-1.5 rounded text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlowCard>
          ))}
        </div>
      )}
    </div>
  )
}

function PromptForm({
  initialType,
  onSubmit,
  onClose,
  onError,
}: {
  initialType: string
  onSubmit: (data: {
    promptType: string
    version: string
    content: string
    changeLog: string
  }) => Promise<void>
  onClose: () => void
  onError: (msg: string) => void
}) {
  const [form, setForm] = useState({
    promptType: initialType,
    version: "",
    content: "",
    changeLog: "",
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.version.trim()) {
      onError("请填写版本号")
      return
    }
    if (!form.content.trim()) {
      onError("请填写提示词内容")
      return
    }
    setSaving(true)
    try {
      await onSubmit(form)
    } catch (err) {
      onError(err instanceof Error ? err.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <GlowCard variant="accent" intensity="high" className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
            <Plus className="w-5 h-5 text-[var(--primary)]" />
            新建提示词版本
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>提示词类型 *</label>
            <select
              value={form.promptType}
              onChange={(e) => setForm({ ...form, promptType: e.target.value })}
              className={inputClass}
            >
              {Object.entries(promptTypeLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>版本号 *</label>
            <input
              type="text"
              value={form.version}
              onChange={(e) => setForm({ ...form, version: e.target.value })}
              placeholder="如：1.0.0"
              className={`${inputClass} font-mono`}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>更新说明</label>
          <input
            type="text"
            value={form.changeLog}
            onChange={(e) => setForm({ ...form, changeLog: e.target.value })}
            placeholder="描述本次更新内容"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>提示词内容 *</label>
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="请输入完整的 System Prompt"
            rows={10}
            className={`${inputClass} resize-none font-mono text-sm`}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            创建草稿
          </button>
        </div>
      </form>
    </GlowCard>
  )
}

function PromptViewer({
  prompt,
  onClose,
}: {
  prompt: PromptVersionItem
  onClose: () => void
}) {
  return (
    <GlowCard variant="primary" className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
            {promptTypeLabels[prompt.promptType] || prompt.promptType}
            <span className="px-2 py-0.5 rounded text-xs font-mono bg-[var(--primary)]/10 text-[var(--primary)]">
              v{prompt.version}
            </span>
            <span
              className="px-2 py-0.5 rounded text-xs"
              style={{
                backgroundColor:
                  prompt.status === "active"
                    ? "color-mix(in srgb, var(--success) 20%, transparent)"
                    : prompt.status === "draft"
                    ? "color-mix(in srgb, var(--warning) 20%, transparent)"
                    : "color-mix(in srgb, var(--foreground-secondary) 20%, transparent)",
                color:
                  prompt.status === "active"
                    ? "var(--success)"
                    : prompt.status === "draft"
                    ? "var(--warning)"
                    : "var(--foreground-secondary)",
              }}
            >
              {prompt.status === "active" ? "已激活" : prompt.status === "draft" ? "草稿" : "已归档"}
            </span>
          </h3>
          {prompt.changeLog && (
            <p className="text-sm text-[var(--foreground-secondary)] mt-1">{prompt.changeLog}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <pre className="p-4 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-sm text-[var(--foreground)] overflow-x-auto whitespace-pre-wrap font-mono">
        {prompt.content}
      </pre>
    </GlowCard>
  )
}

function ComplianceWordTab() {
  const [words, setWords] = useState<ComplianceWord[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingWord, setEditingWord] = useState<ComplianceWord | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>("")
  const [searchText, setSearchText] = useState("")

  const fetchWords = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set("page", String(pagination.page))
      params.set("pageSize", String(pagination.pageSize))
      if (categoryFilter) {
        params.set("category", categoryFilter)
      }
      const res = await fetch(`/api/platform/ai-config/compliance?${params.toString()}`)
      const json: ApiResponse<{ items: ComplianceWord[]; pagination: PaginationInfo }> = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "获取合规词库失败")
      }
      setWords(json.data?.items || [])
      setPagination(json.data?.pagination || pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取合规词库失败")
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.pageSize, categoryFilter])

  useEffect(() => {
    fetchWords()
  }, [fetchWords])

  const handleCreateSubmit = async (data: {
    category: string
    word: string
    replacement: string
    severity: string
  }) => {
    const res = await fetch("/api/platform/ai-config/compliance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json: ApiResponse<ComplianceWord> = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || "添加失败")
    }
    await fetchWords()
    setShowForm(false)
  }

  const handleUpdateSubmit = async (data: {
    category: string
    word: string
    replacement: string
    severity: string
  }) => {
    if (!editingWord) return
    const res = await fetch(`/api/platform/ai-config/compliance/${editingWord.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json: ApiResponse<ComplianceWord> = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || "更新失败")
    }
    await fetchWords()
    setEditingWord(null)
  }

  const handleDelete = async (word: ComplianceWord) => {
    if (!window.confirm(`确定要删除违规词「${word.word}」吗？`)) {
      return
    }
    try {
      const res = await fetch(`/api/platform/ai-config/compliance/${word.id}`, {
        method: "DELETE",
      })
      const json: ApiResponse<{ id: string }> = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "删除失败")
      }
      await fetchWords()
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败")
    }
  }

  const filteredWords = words.filter((w) =>
    searchText ? w.word.includes(searchText) : true
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">合规词库</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-secondary)]" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="搜索违规词"
              className={`${inputClass} pl-9 w-48`}
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value)
              setPagination((p) => ({ ...p, page: 1 }))
            }}
            className={inputClass}
          >
            <option value="">全部分类</option>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <button
            onClick={fetchWords}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            刷新
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            添加违规词
          </button>
        </div>
      </div>

      <ErrorBanner error={error} />

      {showForm && (
        <ComplianceWordForm
          isEditing={false}
          onSubmit={handleCreateSubmit}
          onClose={() => setShowForm(false)}
          onError={(msg) => setError(msg)}
        />
      )}

      {editingWord && (
        <ComplianceWordForm
          isEditing={true}
          initial={{
            category: editingWord.category,
            word: editingWord.word,
            replacement: editingWord.replacement || "",
            severity: editingWord.severity,
          }}
          onSubmit={handleUpdateSubmit}
          onClose={() => setEditingWord(null)}
          onError={(msg) => setError(msg)}
        />
      )}

      {loading ? (
        <GlowCard variant="warning" className="p-8">
          <LoadingState />
        </GlowCard>
      ) : filteredWords.length === 0 ? (
        <GlowCard variant="warning" className="p-12 text-center">
          <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-[var(--foreground-secondary)]/50" />
          <p className="text-[var(--foreground-secondary)]">暂无合规词数据</p>
        </GlowCard>
      ) : (
        <>
          <GlowCard variant="warning" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-4 py-3 text-left font-medium text-[var(--foreground-secondary)]">
                      分类
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--foreground-secondary)]">
                      违规词
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--foreground-secondary)]">
                      替换词
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--foreground-secondary)]">
                      严重程度
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--foreground-secondary)]">
                      创建时间
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-[var(--foreground-secondary)]">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWords.map((word) => (
                    <tr
                      key={word.id}
                      className="border-b border-[var(--border)]/50 hover:bg-[var(--background)]/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs bg-[var(--primary)]/10 text-[var(--primary)]">
                          {categoryLabels[word.category] || word.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground)] font-medium">{word.word}</td>
                      <td className="px-4 py-3 text-[var(--foreground-secondary)]">
                        {word.replacement || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded text-xs"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${severityColors[word.severity]} 20%, transparent)`,
                            color: severityColors[word.severity],
                          }}
                        >
                          {severityLabels[word.severity] || word.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground-secondary)] text-xs">
                        {new Date(word.createdAt).toLocaleString("zh-CN")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingWord(word)}
                            className="p-1.5 rounded text-[var(--foreground-secondary)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(word)}
                            className="p-1.5 rounded text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlowCard>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                disabled={pagination.page <= 1}
                className="p-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-[var(--foreground-secondary)] px-3">
                第 {pagination.page} / {pagination.totalPages} 页，共 {pagination.total} 条
              </span>
              <button
                onClick={() =>
                  setPagination((p) => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))
                }
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ComplianceWordForm({
  isEditing,
  initial,
  onSubmit,
  onClose,
  onError,
}: {
  isEditing: boolean
  initial?: {
    category: string
    word: string
    replacement: string
    severity: string
  }
  onSubmit: (data: {
    category: string
    word: string
    replacement: string
    severity: string
  }) => Promise<void>
  onClose: () => void
  onError: (msg: string) => void
}) {
  const [form, setForm] = useState({
    category: initial?.category || "prohibited_promise",
    word: initial?.word || "",
    replacement: initial?.replacement || "",
    severity: initial?.severity || "medium",
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.word.trim()) {
      onError("请填写违规词")
      return
    }
    setSaving(true)
    try {
      await onSubmit(form)
    } catch (err) {
      onError(err instanceof Error ? err.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <GlowCard variant="warning" intensity="high" className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
            {isEditing ? <Edit3 className="w-5 h-5 text-[var(--primary)]" /> : <Plus className="w-5 h-5 text-[var(--primary)]" />}
            {isEditing ? "编辑违规词" : "添加违规词"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>分类 *</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={inputClass}
            >
              {Object.entries(categoryLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>严重程度</label>
            <select
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value })}
              className={inputClass}
            >
              {Object.entries(severityLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>违规词 *</label>
          <input
            type="text"
            value={form.word}
            onChange={(e) => setForm({ ...form, word: e.target.value })}
            placeholder="请输入违规词"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>替换词（可选）</label>
          <input
            type="text"
            value={form.replacement}
            onChange={(e) => setForm({ ...form, replacement: e.target.value })}
            placeholder="建议替换为的词汇"
            className={inputClass}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEditing ? "保存修改" : "添加"}
          </button>
        </div>
      </form>
    </GlowCard>
  )
}

function CallLogsTab() {
  const [logs, setLogs] = useState<AICallLog[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [providerFilter, setProviderFilter] = useState("")
  const [callTypeFilter, setCallTypeFilter] = useState("")
  const [successFilter, setSuccessFilter] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set("page", String(pagination.page))
      params.set("pageSize", String(pagination.pageSize))
      if (providerFilter) params.set("provider", providerFilter)
      if (callTypeFilter) params.set("callType", callTypeFilter)
      if (successFilter) params.set("success", successFilter)
      if (startDate) params.set("startDate", startDate)
      if (endDate) params.set("endDate", endDate)

      const res = await fetch(`/api/platform/ai-config/call-logs?${params.toString()}`)
      const json: ApiResponse<{ items: AICallLog[]; pagination: PaginationInfo }> = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "获取调用日志失败")
      }
      setLogs(json.data?.items || [])
      setPagination(json.data?.pagination || pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取调用日志失败")
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.pageSize, providerFilter, callTypeFilter, successFilter, startDate, endDate])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleFilter = () => {
    setPagination((p) => ({ ...p, page: 1 }))
  }

  const handleReset = () => {
    setProviderFilter("")
    setCallTypeFilter("")
    setSuccessFilter("")
    setStartDate("")
    setEndDate("")
    setPagination((p) => ({ ...p, page: 1 }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">调用日志</h2>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </button>
      </div>

      <ErrorBanner error={error} />

      <GlowCard variant="success" className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className={labelClass}>服务商</label>
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className={inputClass}
            >
              <option value="">全部</option>
              {Object.entries(providerLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>调用类型</label>
            <select
              value={callTypeFilter}
              onChange={(e) => setCallTypeFilter(e.target.value)}
              className={inputClass}
            >
              <option value="">全部</option>
              {Object.entries(callTypeLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>状态</label>
            <select
              value={successFilter}
              onChange={(e) => setSuccessFilter(e.target.value)}
              className={inputClass}
            >
              <option value="">全部</option>
              <option value="true">成功</option>
              <option value="false">失败</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>结束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
          >
            重置
          </button>
          <button
            onClick={handleFilter}
            className="px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            筛选
          </button>
        </div>
      </GlowCard>

      {loading ? (
        <GlowCard variant="success" className="p-8">
          <LoadingState />
        </GlowCard>
      ) : logs.length === 0 ? (
        <GlowCard variant="success" className="p-12 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-[var(--foreground-secondary)]/50" />
          <p className="text-[var(--foreground-secondary)]">暂无调用日志</p>
        </GlowCard>
      ) : (
        <>
          <GlowCard variant="success" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-4 py-3 text-left font-medium text-[var(--foreground-secondary)]">
                      时间
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--foreground-secondary)]">
                      服务商
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--foreground-secondary)]">
                      模型
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--foreground-secondary)]">
                      类型
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-[var(--foreground-secondary)]">
                      Token
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-[var(--foreground-secondary)]">
                      耗时
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-[var(--foreground-secondary)]">
                      状态
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--foreground-secondary)]">
                      错误
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-[var(--border)]/50 hover:bg-[var(--background)]/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-[var(--foreground-secondary)] text-xs whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("zh-CN")}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs bg-[var(--primary)]/10 text-[var(--primary)]">
                          {providerLabels[log.provider] || log.provider}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground)] font-mono text-xs">
                        {log.model || "-"}
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground-secondary)]">
                        {callTypeLabels[log.callType] || log.callType}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--foreground)] font-mono text-xs">
                        {log.totalTokens ? log.totalTokens.toLocaleString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--foreground-secondary)] text-xs whitespace-nowrap">
                        {log.durationMs ? `${(log.durationMs / 1000).toFixed(2)}s` : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {log.success ? (
                          <CheckCircle2 className="w-4 h-4 text-[var(--success)] mx-auto" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-[var(--danger)] mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--danger)] text-xs max-w-xs truncate">
                        {log.errorMessage || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlowCard>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                disabled={pagination.page <= 1}
                className="p-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-[var(--foreground-secondary)] px-3">
                第 {pagination.page} / {pagination.totalPages} 页，共 {pagination.total} 条
              </span>
              <button
                onClick={() =>
                  setPagination((p) => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))
                }
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 rounded-lg border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
