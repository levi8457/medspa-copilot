import { NextResponse } from "next/server"
import Redis from "ioredis"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type DependencyStatus = {
  ok: boolean
  latencyMs: number
}

// GET - Load-balancer health check. Never expose dependency URLs or error details.
export async function GET() {
  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()])
  const healthy = database.ok && redis.ok

  return NextResponse.json(
    {
      success: healthy,
      status: healthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      dependencies: { database, redis },
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  )
}

async function checkDatabase(): Promise<DependencyStatus> {
  const startedAt = performance.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return { ok: true, latencyMs: Math.round(performance.now() - startedAt) }
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - startedAt) }
  }
}

async function checkRedis(): Promise<DependencyStatus> {
  const startedAt = performance.now()
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379"
  const client = new Redis(redisUrl, {
    lazyConnect: true,
    connectTimeout: 1_500,
    maxRetriesPerRequest: 0,
    enableReadyCheck: false,
  })

  try {
    await client.connect()
    await client.ping()
    return { ok: true, latencyMs: Math.round(performance.now() - startedAt) }
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - startedAt) }
  } finally {
    client.disconnect()
  }
}
