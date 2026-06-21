"use client"

import { cn } from "@/lib/utils"
import { CountUp } from "@/components/CountUp"
import type { ReactNode } from "react"

interface HudPanelProps {
  label: string
  value: string | number
  unit?: string
  icon?: ReactNode
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  className?: string
}

const trendColors = {
  up: "text-[#00FFA3]",
  down: "text-[#FF4D6A]",
  neutral: "text-[#FFB300]",
}

export function HudPanel({
  label,
  value,
  unit,
  icon,
  trend,
  trendValue,
  className,
}: HudPanelProps) {
  const isNumeric = typeof value === "number" || (typeof value === "string" && !isNaN(Number(value)))

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1 rounded-lg border border-[var(--border)]",
        "bg-[var(--background-glass)] backdrop-blur-xl p-4",
        "transition-all duration-250 hover:border-[var(--border-hover)]",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--foreground-secondary)]">
          {label}
        </span>
        {icon && <span className="text-[var(--foreground-muted)] size-4">{icon}</span>}
      </div>

      <div className="flex items-baseline gap-1">
        <span className="font-mono text-2xl font-bold tabular-nums text-[var(--foreground)]">
          {isNumeric ? (
            <CountUp end={Number(value)} decimals={String(value).includes(".") ? 1 : 0} />
          ) : (
            value
          )}
        </span>
        {unit && (
          <span className="font-mono text-sm text-[var(--foreground-muted)]">{unit}</span>
        )}
      </div>

      {trend && trendValue && (
        <span className={cn("font-mono text-xs tabular-nums", trendColors[trend])}>
          {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
        </span>
      )}
    </div>
  )
}
