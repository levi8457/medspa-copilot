"use client"

import { cn } from "@/lib/utils"

interface StrategyProgressProps {
  completed: number
  total: number
  className?: string
  showLabel?: boolean
}

export function StrategyProgress({ completed, total, className, showLabel = true }: StrategyProgressProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex-1 h-2 bg-[var(--background)] rounded-full overflow-hidden border border-[var(--border)]">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            percentage === 100
              ? "bg-gradient-to-r from-[var(--success)] to-[#00FFA3]"
              : percentage > 50
              ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]"
              : "bg-gradient-to-r from-[var(--warning)] to-[var(--primary)]"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-mono text-[var(--foreground-secondary)] tabular-nums whitespace-nowrap">
          {completed}/{total}
        </span>
      )}
    </div>
  )
}
