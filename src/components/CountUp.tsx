"use client"

import { useEffect, useRef, useState } from "react"

interface CountUpProps {
  end: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}

export function CountUp({ end, duration = 1000, decimals = 0, prefix = "", suffix = "", className }: CountUpProps) {
  const [value, setValue] = useState(0)
  const startTime = useRef<number | null>(null)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    startTime.current = null

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const progress = Math.min((timestamp - startTime.current) / duration, 1)

      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(eased * end)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [end, duration])

  const formatted = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString()

  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  )
}
