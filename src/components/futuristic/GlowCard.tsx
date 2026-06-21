"use client"

import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

interface GlowCardProps extends HTMLMotionProps<"div"> {
  variant?: "primary" | "accent" | "success" | "warning" | "danger"
  intensity?: "low" | "medium" | "high"
}

const glowVariants = {
  primary: "shadow-[0_0_12px_rgba(0,229,255,0.15)] hover:shadow-[0_0_24px_rgba(0,229,255,0.3)]",
  accent: "shadow-[0_0_12px_rgba(124,77,255,0.15)] hover:shadow-[0_0_24px_rgba(124,77,255,0.3)]",
  success: "shadow-[0_0_12px_rgba(0,255,163,0.15)] hover:shadow-[0_0_24px_rgba(0,255,163,0.3)]",
  warning: "shadow-[0_0_12px_rgba(255,179,0,0.15)] hover:shadow-[0_0_24px_rgba(255,179,0,0.3)]",
  danger: "shadow-[0_0_12px_rgba(255,77,106,0.15)] hover:shadow-[0_0_24px_rgba(255,77,106,0.3)]",
}

const borderColors = {
  primary: "border-[#00E5FF]/20 hover:border-[#00E5FF]/50",
  accent: "border-[#7C4DFF]/20 hover:border-[#7C4DFF]/50",
  success: "border-[#00FFA3]/20 hover:border-[#00FFA3]/50",
  warning: "border-[#FFB300]/20 hover:border-[#FFB300]/50",
  danger: "border-[#FF4D6A]/20 hover:border-[#FF4D6A]/50",
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
