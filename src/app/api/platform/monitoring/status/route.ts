import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

interface ServiceStatus {
  name: string
  status: "healthy" | "warning" | "critical"
  uptime: number
  latency: number
}

interface SystemStatusData {
  services: ServiceStatus[]
  errorRate24h: number
  callCount24h: number
  activeOrgs: number
  errorRateTrend: { time: string; value: number }[]
  callCountTrend: { time: string; value: number }[]
  alertStats: {
    pending: number
    acknowledged: number
    resolved: number
    critical: number
    warning: number
    info: number
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "无权限访问" } },
        { status: 403 }
      )
    }

    const hours = Array.from({ length: 24 }, (_, i) => {
      const h = new Date()
      h.setHours(h.getHours() - 23 + i)
      return h.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    })

    const data: SystemStatusData = {
      services: [
        { name: "API 服务", status: "healthy", uptime: 99.97, latency: 45 },
        { name: "Worker 队列", status: "healthy", uptime: 99.95, latency: 120 },
        { name: "数据库", status: "warning", uptime: 99.99, latency: 8 },
        { name: "OSS 存储", status: "healthy", uptime: 99.98, latency: 60 },
      ],
      errorRate24h: 0.32,
      callCount24h: 128456,
      activeOrgs: 42,
      errorRateTrend: hours.map((time, i) => ({
        time,
        value: Math.max(0, 0.2 + Math.sin(i / 3) * 0.15 + Math.random() * 0.1),
      })),
      callCountTrend: hours.map((time, i) => ({
        time,
        value: Math.floor(3000 + Math.sin(i / 4) * 1500 + Math.random() * 800),
      })),
      alertStats: {
        pending: 8,
        acknowledged: 3,
        resolved: 156,
        critical: 2,
        warning: 6,
        info: 12,
      },
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("获取系统监控状态失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取系统监控状态失败" } },
      { status: 500 }
    )
  }
}
