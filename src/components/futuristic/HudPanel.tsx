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
  variant?: "primary" | "success" | "warning" | "danger" | "accent"
}

const trendColors = {
  up: "text-[var(--success)]",
  down: "text-[var(--danger)]",
  neutral: "text-[var(--warning)]",
}

const variantStyles = {
  primary: "border-[var(--primary)]/30 hover:border-[var(--primary)]/60",
  success: "border-[var(--success)]/30 hover:border-[var(--success)]/60",
  warning: "border-[var(--warning)]/30 hover:border-[var(--warning)]/60",
  danger: "border-[var(--danger)]/30 hover:border-[var(--danger)]/60",
  accent: "border-[var(--accent)]/30 hover:border-[var(--accent)]/60",
}

export function HudPanel({
  label,
  value,
  unit,
  icon,
  trend,
  trendValue,
  className,
  variant = "primary",
}: HudPanelProps) {
  const isNumeric = typeof value === "number" || (typeof value === "string" && !isNaN(Number(value)))

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1 rounded-lg border",
        "bg-[var(--background-glass)] backdrop-blur-xl p-4",
        "transition-all duration-250",
        variantStyles[variant],
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
