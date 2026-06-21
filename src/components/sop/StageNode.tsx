"use client"

import { memo, useState } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Phone, MessageCircle, MapPin, Mail, GripVertical, Trash2, ChevronDown, ChevronUp } from "lucide-react"

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

function StageNodeComponent({ id, data, selected }: NodeProps & { data: StageNodeData }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const config = touchpointConfig[data.touchpointType]
  const Icon = config.icon

  return (
    <div
      className={`relative min-w-[240px] max-w-[300px] rounded-xl border-2 transition-all duration-200 ${
        selected
          ? "border-[var(--primary)] shadow-[0_0_20px_rgba(0,229,255,0.3)]"
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
          className="w-8 h-8 rounded-lg flex items-center justify-center"
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
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-[var(--border)] rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-3 h-3 text-[var(--foreground-secondary)]" />
            ) : (
              <ChevronDown className="w-3 h-3 text-[var(--foreground-secondary)]" />
            )}
          </button>
          <button
            onClick={() => data.onDelete?.(id)}
            className="p-1 hover:bg-[var(--danger)]/20 rounded transition-colors"
          >
            <Trash2 className="w-3 h-3 text-[var(--danger)]" />
          </button>
        </div>
      </div>

      {/* Description */}
      {data.description && (
        <div className="px-3 py-2">
          <p className="text-xs text-[var(--foreground-secondary)] line-clamp-2">{data.description}</p>
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && data.scriptTemplate && (
        <div className="px-3 pb-3 border-t border-[var(--border)] mt-1 pt-2">
          <p className="text-xs font-medium text-[var(--foreground-secondary)] mb-1">话术模板</p>
          <p className="text-xs text-[var(--foreground)] bg-[var(--background)] rounded p-2 max-h-24 overflow-y-auto">
            {data.scriptTemplate}
          </p>
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
