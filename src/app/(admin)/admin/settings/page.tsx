"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Save, Tag, FileText, Shield, Bell, MessageSquare } from "lucide-react"
import { GlowCard } from "@/components/futuristic/GlowCard"

interface TagSchema {
  id: string
  dimension: string
  values: string[]
  isRequired: boolean
  sortOrder: number
}

interface ScriptConfig {
  tone: string
  forbiddenWords: string[]
  brandVoice: string
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"tags" | "sop" | "compliance" | "script" | "notifications">("tags")
  const [tagSchemas, setTagSchemas] = useState<TagSchema[]>([
    { id: "1", dimension: "年龄段", values: ["18-25", "26-30", "31-35", "36-40", "41-50", "50+"], isRequired: true, sortOrder: 0 },
    { id: "2", dimension: "预算区间", values: ["5千以下", "5千-1万", "1万-3万", "3万-5万", "5万-10万", "10万以上"], isRequired: true, sortOrder: 1 },
    { id: "3", dimension: "需求意向", values: ["双眼皮", "隆鼻", "热玛吉", "水光针", "玻尿酸", "其他"], isRequired: true, sortOrder: 2 },
    { id: "4", dimension: "顾虑点", values: ["怕痛", "恢复期", "价格", "效果", "安全", "隐私", "其他"], isRequired: false, sortOrder: 3 },
  ])

  const [scriptConfig, setScriptConfig] = useState<ScriptConfig>({
    tone: "warm",
    forbiddenWords: ["保证", "肯定", "最好", "第一", "100%", "绝对", "永远"],
    brandVoice: "专业、温暖、值得信赖",
  })

  const [newDimension, setNewDimension] = useState("")
  const [newValues, setNewValues] = useState("")
  const [newForbiddenWord, setNewForbiddenWord] = useState("")

  const handleAddTagSchema = () => {
    if (!newDimension || !newValues) return
    const values = newValues.split(",").map((v) => v.trim()).filter(Boolean)
    const newSchema: TagSchema = {
      id: Date.now().toString(),
      dimension: newDimension,
      values,
      isRequired: false,
      sortOrder: tagSchemas.length,
    }
    setTagSchemas([...tagSchemas, newSchema])
    setNewDimension("")
    setNewValues("")
  }

  const handleDeleteTagSchema = (id: string) => {
    setTagSchemas(tagSchemas.filter((s) => s.id !== id))
  }

  const handleAddForbiddenWord = () => {
    if (!newForbiddenWord.trim()) return
    if (!scriptConfig.forbiddenWords.includes(newForbiddenWord.trim())) {
      setScriptConfig({
        ...scriptConfig,
        forbiddenWords: [...scriptConfig.forbiddenWords, newForbiddenWord.trim()],
      })
    }
    setNewForbiddenWord("")
  }

  const handleRemoveForbiddenWord = (word: string) => {
    setScriptConfig({
      ...scriptConfig,
      forbiddenWords: scriptConfig.forbiddenWords.filter((w) => w !== word),
    })
  }

  const handleSave = async () => {
    try {
      await fetch("/api/settings/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schemas: tagSchemas, scriptConfig }),
      })
      alert("保存成功")
    } catch (error) {
      console.error("保存失败:", error)
      alert("保存失败")
    }
  }

  const tabs = [
    { id: "tags" as const, label: "标签体系", icon: Tag },
    { id: "script" as const, label: "话术配置", icon: MessageSquare },
    { id: "sop" as const, label: "SOP 模板", icon: FileText },
    { id: "compliance" as const, label: "合规配置", icon: Shield },
    { id: "notifications" as const, label: "通知设置", icon: Bell },
  ]

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">系统设置</h1>
            <p className="text-[var(--foreground-secondary)] mt-1">配置机构标准化参数</p>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            <Save className="w-4 h-4" />
            保存设置
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-[var(--border)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-[var(--primary)] border-b-2 border-[var(--primary)]"
                  : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === "tags" && (
            <div className="space-y-6">
              <GlowCard className="p-6">
                <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">标签维度管理</h2>
                <div className="space-y-3">
                  {tagSchemas.map((schema, index) => (
                    <motion.div
                      key={schema.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 bg-[var(--background)] rounded-lg border border-[var(--border)]"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--foreground)]">{schema.dimension}</span>
                          {schema.isRequired && (
                            <span className="px-1.5 py-0.5 text-xs bg-[var(--primary)]/20 text-[var(--primary)] rounded">必填</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {schema.values.map((value) => (
                            <span key={value} className="px-2 py-0.5 text-xs bg-[var(--card)] text-[var(--foreground-secondary)] rounded">{value}</span>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteTagSchema(schema.id)} className="px-3 py-1.5 text-sm text-[var(--danger)] hover:bg-[var(--danger)]/10 rounded transition-colors">删除</button>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-[var(--background)] rounded-lg border border-dashed border-[var(--border)]">
                  <h3 className="text-sm font-medium text-[var(--foreground)] mb-3">添加新维度</h3>
                  <div className="flex gap-3">
                    <input type="text" value={newDimension} onChange={(e) => setNewDimension(e.target.value)} placeholder="维度名称" className="flex-1 p-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                    <input type="text" value={newValues} onChange={(e) => setNewValues(e.target.value)} placeholder="可选值（逗号分隔）" className="flex-2 p-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                    <button onClick={handleAddTagSchema} disabled={!newDimension || !newValues} className="px-4 py-2 bg-[var(--primary)]/20 text-[var(--primary)] rounded-lg text-sm font-medium hover:bg-[var(--primary)]/30 transition-colors disabled:opacity-50">添加</button>
                  </div>
                </div>
              </GlowCard>
            </div>
          )}

          {activeTab === "script" && (
            <div className="space-y-6">
              <GlowCard className="p-6">
                <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">话术风格配置</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-2">默认语气风格</label>
                    <select
                      value={scriptConfig.tone}
                      onChange={(e) => setScriptConfig({ ...scriptConfig, tone: e.target.value })}
                      className="w-full p-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    >
                      <option value="warm">温暖亲切</option>
                      <option value="professional">专业严谨</option>
                      <option value="friendly">轻松活泼</option>
                      <option value="caring">关怀体贴</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-2">品牌语气描述</label>
                    <textarea
                      value={scriptConfig.brandVoice}
                      onChange={(e) => setScriptConfig({ ...scriptConfig, brandVoice: e.target.value })}
                      rows={3}
                      className="w-full p-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      placeholder="描述您机构的话术风格..."
                    />
                  </div>
                </div>
              </GlowCard>

              <GlowCard className="p-6">
                <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">禁用词管理</h2>
                <p className="text-sm text-[var(--foreground-secondary)] mb-4">包含这些词的话术将被标记为合规风险</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {scriptConfig.forbiddenWords.map((word) => (
                    <span
                      key={word}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--danger)]/10 text-[var(--danger)] rounded-full text-sm"
                    >
                      {word}
                      <button
                        onClick={() => handleRemoveForbiddenWord(word)}
                        className="ml-1 hover:text-[var(--danger)]/80"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newForbiddenWord}
                    onChange={(e) => setNewForbiddenWord(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddForbiddenWord()}
                    placeholder="输入禁用词"
                    className="flex-1 p-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                  <button
                    onClick={handleAddForbiddenWord}
                    disabled={!newForbiddenWord.trim()}
                    className="px-4 py-2 bg-[var(--danger)]/20 text-[var(--danger)] rounded-lg text-sm font-medium hover:bg-[var(--danger)]/30 transition-colors disabled:opacity-50"
                  >
                    添加
                  </button>
                </div>
              </GlowCard>
            </div>
          )}

          {activeTab === "sop" && (
            <GlowCard className="p-6">
              <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">SOP 模板管理</h2>
              <p className="text-[var(--foreground-secondary)]">
                前往 <a href="/admin/sop" className="text-[var(--primary)] hover:underline">SOP 管理页面</a> 进行模板管理
              </p>
            </GlowCard>
          )}

          {activeTab === "compliance" && (
            <GlowCard className="p-6">
              <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">合规配置</h2>
              <div className="space-y-4">
                <div className="p-4 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                  <h3 className="font-medium text-[var(--foreground)] mb-2">医疗违禁词过滤</h3>
                  <p className="text-sm text-[var(--foreground-secondary)]">AI 生成的话术将自动过滤医疗广告违禁词</p>
                  <div className="mt-2">
                    <span className="px-2 py-1 text-xs bg-[var(--success)]/20 text-[var(--success)] rounded">已启用</span>
                  </div>
                </div>
                <div className="p-4 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                  <h3 className="font-medium text-[var(--foreground)] mb-2">录音知情同意</h3>
                  <p className="text-sm text-[var(--foreground-secondary)]">上传录音前需获取客户知情同意</p>
                  <div className="mt-2">
                    <span className="px-2 py-1 text-xs bg-[var(--success)]/20 text-[var(--success)] rounded">已启用</span>
                  </div>
                </div>
              </div>
            </GlowCard>
          )}

          {activeTab === "notifications" && (
            <GlowCard className="p-6">
              <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">通知设置</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                  <div>
                    <h3 className="font-medium text-[var(--foreground)]">每日任务提醒</h3>
                    <p className="text-sm text-[var(--foreground-secondary)]">每日早上 9:00 推送今日待跟进任务</p>
                  </div>
                  <div className="w-12 h-6 bg-[var(--primary)] rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                  <div>
                    <h3 className="font-medium text-[var(--foreground)]">录音解析完成通知</h3>
                    <p className="text-sm text-[var(--foreground-secondary)]">录音解析完成后通知咨询师</p>
                  </div>
                  <div className="w-12 h-6 bg-[var(--primary)] rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                  </div>
                </div>
              </div>
            </GlowCard>
          )}
        </div>
      </div>
    </div>
  )
}
