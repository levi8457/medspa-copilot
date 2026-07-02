"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface TagCapsuleProps {
  label: string
  variant?: "primary" | "accent" | "success" | "warning" | "danger" | "neutral"
  size?: "sm" | "md" | "lg"
  onRemove?: () => void
  onClick?: () => void
  animated?: boolean
  className?: string
}

const variantStyles = {
  primary: "bg-[var(--primary-dim)] text-[var(--primary)] border-[var(--primary)]/30",
  accent: "bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent)]/30",
  success: "bg-[var(--success-dim)] text-[var(--success)] border-[var(--success)]/30",
  warning: "bg-[var(--warning-dim)] text-[var(--warning)] border-[var(--warning)]/30",
  danger: "bg-[var(--danger-dim)] text-[var(--danger)] border-[var(--danger)]/30",
  neutral: "bg-[var(--border)] text-[var(--foreground-secondary)] border-[var(--border)]",
}

const sizeStyles = {
  sm: "px-2 py-0.5 text-xs gap-1",
  md: "px-3 py-1 text-sm gap-1.5",
  lg: "px-4 py-1.5 text-base gap-2",
}

export function TagCapsule({
  label,
  variant = "primary",
  size = "md",
  onRemove,
  onClick,
  animated = false,
  className,
}: TagCapsuleProps) {
  const Comp = onClick ? "button" : "span"
  const handlers = onClick ? { onClick } : {}

  const content = (
    <Comp
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        "transition-all duration-200",
        onClick && "cursor-pointer hover:opacity-80",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...handlers}
    >
      <span className="inline-block size-1.5 rounded-full bg-current mr-1" />
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/20 transition-colors"
        >
          <X className="size-3" />
        </button>
      )}
    </Comp>
  )

  if (animated) {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="inline-flex"
      >
        {content}
      </motion.div>
    )
  }

  return content
}
