"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface EnergyRingProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  variant?: "primary" | "accent" | "success" | "warning" | "danger"
  label?: string
  showValue?: boolean
  className?: string
}

const ringColors = {
  primary: { stroke: "var(--primary)", glow: "var(--primary-dim)" },
  accent: { stroke: "var(--accent)", glow: "var(--accent-dim)" },
  success: { stroke: "var(--success)", glow: "var(--success-dim)" },
  warning: { stroke: "var(--warning)", glow: "var(--warning-dim)" },
  danger: { stroke: "var(--danger)", glow: "var(--danger-dim)" },
}

export function EnergyRing({
  value,
  max = 100,
  size = 80,
  strokeWidth = 4,
  variant = "primary",
  label,
  showValue = true,
  className,
}: EnergyRingProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference
  const center = size / 2
  const { stroke, glow } = ringColors[variant]

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          filter={`drop-shadow(0 0 6px ${glow})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showValue && (
          <motion.span
            className="font-mono text-sm font-bold tabular-nums"
            style={{ color: stroke }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {Math.round(percentage)}
          </motion.span>
        )}
        {label && (
          <span className="text-[10px] leading-tight text-[var(--foreground-muted)]">
            {label}
          </span>
        )}
      </div>
    </div>
  )
}
