"use client"

import { memo, useState } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Phone, MessageCircle, MapPin, Mail, Trash2, ChevronDown, ChevronUp } from "lucide-react"

export interface StageNodeData {
  label: string
  description?: string
  touchpointType: "phone" | "wechat" | "visit" | "sms"
  scriptTemplate?: string
  delayDays: number
  onUpdate?: (id: string, data: Partial<StageNodeData>) => void
  onDelete?: (id: string) => void
  [key: string]: unknown
}

const touchpointConfig = {
  phone: { icon: Phone, label: "电话", color: "var(--primary)" },
  wechat: { icon: MessageCircle, label: "微信", color: "var(--success)" },
  visit: { icon: MapPin, label: "到店", color: "var(--accent)" },
  sms: { icon: Mail, label: "短信", color: "var(--warning)" },
}

const touchpointTypes = ["phone", "wechat", "visit", "sms"] as const

function StageNodeComponent({ id, data, selected }: NodeProps & { data: StageNodeData }) {
  const [isExpanded, setIsExpanded] = useState(false)
  // 只有传入 onUpdate 时才允许编辑（readOnly 视图不传）
  const editable = !!data.onUpdate
  const config = touchpointConfig[data.touchpointType]
  const Icon = config.icon

  const handleUpdate = (patch: Partial<StageNodeData>) => {
    data.onUpdate?.(id, patch)
  }

  const inputClass =
    "w-full p-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"

  return (
    <div
      className={`relative min-w-[260px] max-w-[320px] rounded-xl border-2 transition-all duration-200 ${
        selected
          ? "border-[var(--primary)] shadow-[var(--glow-primary-lg)]"
          : "border-[var(--border)] hover:border-[var(--primary)]/50"
      } bg-[var(--card)] backdrop-blur-sm`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-[var(--primary)] border-2 border-[var(--card)]"
      />

      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-[var(--border)]">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${config.color}20` }}
        >
          <Icon className="w-4 h-4" style={{ color: config.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-[var(--foreground)] truncate">{data.label}</p>
          <p className="text-xs text-[var(--foreground-secondary)]">
            第 {data.delayDays} 天 · {config.label}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-[var(--border)] rounded transition-colors"
            title={isExpanded ? "收起" : "编辑/查看"}
          >
            {isExpanded ? (
              <ChevronUp className="w-3 h-3 text-[var(--foreground-secondary)]" />
            ) : (
              <ChevronDown className="w-3 h-3 text-[var(--foreground-secondary)]" />
            )}
          </button>
          {editable && (
            <button
              onClick={() => data.onDelete?.(id)}
              className="p-1 hover:bg-[var(--danger)]/20 rounded transition-colors"
              title="删除阶段"
            >
              <Trash2 className="w-3 h-3 text-[var(--danger)]" />
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      {data.description && (
        <div className="px-3 py-2">
          <p className="text-xs text-[var(--foreground-secondary)] line-clamp-2">{data.description}</p>
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-[var(--border)] mt-1 pt-2 space-y-2">
          {editable ? (
            <>
              <div>
                <label className="block text-xs font-medium text-[var(--foreground-secondary)] mb-1">
                  阶段名称
                </label>
                <input
                  type="text"
                  value={data.label}
                  onChange={(e) => handleUpdate({ label: e.target.value })}
                  className={inputClass}
                  placeholder="例如：术后第 3 天微信回访"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-[var(--foreground-secondary)] mb-1">
                    触达方式
                  </label>
                  <select
                    value={data.touchpointType}
                    onChange={(e) =>
                      handleUpdate({ touchpointType: e.target.value as StageNodeData["touchpointType"] })
                    }
                    className={inputClass}
                  >
                    {touchpointTypes.map((t) => (
                      <option key={t} value={t}>
                        {touchpointConfig[t].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--foreground-secondary)] mb-1">
                    延迟天数
                  </label>
                  <input
                    type="number"
                    value={data.delayDays}
                    onChange={(e) => handleUpdate({ delayDays: parseInt(e.target.value, 10) || 0 })}
                    className={inputClass}
                    min={0}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--foreground-secondary)] mb-1">
                  话术模板
                </label>
                <textarea
                  value={data.scriptTemplate || ""}
                  onChange={(e) => handleUpdate({ scriptTemplate: e.target.value })}
                  className={`${inputClass} resize-none h-20`}
                  placeholder="填写此阶段的沟通话术模板，可用 {客户称呼}、{机构名} 等占位符"
                />
              </div>
            </>
          ) : (
            <>
              {data.description && (
                <div>
                  <p className="text-xs font-medium text-[var(--foreground-secondary)] mb-1">说明</p>
                  <p className="text-xs text-[var(--foreground)]">{data.description}</p>
                </div>
              )}
              {data.scriptTemplate && (
                <div>
                  <p className="text-xs font-medium text-[var(--foreground-secondary)] mb-1">话术模板</p>
                  <p className="text-xs text-[var(--foreground)] bg-[var(--background)] rounded p-2 max-h-28 overflow-y-auto whitespace-pre-wrap">
                    {data.scriptTemplate}
                  </p>
                </div>
              )}
              {!data.description && !data.scriptTemplate && (
                <p className="text-xs text-[var(--foreground-secondary)]">该阶段暂无更多内容</p>
              )}
            </>
          )}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-[var(--accent)] border-2 border-[var(--card)]"
      />
    </div>
  )
}

export const StageNode = memo(StageNodeComponent)
