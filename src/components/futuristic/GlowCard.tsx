"use client"

import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

interface GlowCardProps extends HTMLMotionProps<"div"> {
  variant?: "primary" | "accent" | "success" | "warning" | "danger"
  intensity?: "low" | "medium" | "high"
}

const glowVariants = {
  primary: "shadow-[var(--glow-primary-sm)] hover:shadow-[var(--glow-primary-lg)]",
  accent: "shadow-[var(--glow-accent-sm)] hover:shadow-[var(--glow-accent-lg)]",
  success: "shadow-[var(--glow-success-sm)] hover:shadow-[var(--glow-success-lg)]",
  warning: "shadow-[var(--glow-warning-sm)] hover:shadow-[var(--glow-warning-lg)]",
  danger: "shadow-[var(--glow-danger-sm)] hover:shadow-[var(--glow-danger-lg)]",
}

const borderColors = {
  primary: "border-[var(--primary)]/20 hover:border-[var(--primary)]/50",
  accent: "border-[var(--accent)]/20 hover:border-[var(--accent)]/50",
  success: "border-[var(--success)]/20 hover:border-[var(--success)]/50",
  warning: "border-[var(--warning)]/20 hover:border-[var(--warning)]/50",
  danger: "border-[var(--danger)]/20 hover:border-[var(--danger)]/50",
}

export function GlowCard({
  variant = "primary",
  intensity = "medium",
  className,
  children,
  ...props
}: GlowCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "relative rounded-xl border bg-[var(--background-card)] backdrop-blur-xl",
        "transition-all duration-300",
        "hover:-translate-y-0.5",
        glowVariants[variant],
        borderColors[variant],
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  )
}
