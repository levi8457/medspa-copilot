import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { withTenantFilter, tenantWhere } from "@/lib/db-tenant"
import { z } from "zod"

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式无效")

// GET - 获取每日工作台数据
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const requestedDate = searchParams.get("date") || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" })
  const parsedDate = dateSchema.safeParse(requestedDate)
  if (!parsedDate.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "日期格式无效，应为 YYYY-MM-DD" } },
      { status: 400 }
    )
  }
  const date = parsedDate.data

  try {
    // 获取今日待跟进任务
    const todayStart = new Date(`${date}T00:00:00+08:00`)
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    const dayWhere: Record<string, unknown> = {
      scheduledDate: {
        gte: todayStart,
        lt: todayEnd,
      },
    }

    const baseArgs = {
      where: { ...dayWhere, status: { in: ["pending", "postponed"] } },
      orderBy: { priority: "asc" as const },
      include: {
        plan: {
          select: {
            id: true,
            title: true,
            strategy: true,
          },
        },
      },
    }

    const args = withTenantFilter("FollowUpTask", session, baseArgs)

    const tasks = await prisma.followUpTask.findMany(args as Parameters<typeof prisma.followUpTask.findMany>[0])

    // 获取客户信息
    const customerIds = [...new Set(tasks.map((t) => t.customerId))]
    const customers = await prisma.customer.findMany({
      where: tenantWhere("Customer", session, { id: { in: customerIds } }),
      select: {
        id: true,
        name: true,
        phone: true,
        tags: {
          select: {
            dimension: true,
            value: true,
          },
        },
      },
    })

    const customerMap = new Map(customers.map((c) => [c.id, c]))

    // 组装工作台数据
    const workbenchTasks = tasks.map((task) => {
      const customer = customerMap.get(task.customerId)
      const scriptData = task.script ? JSON.parse(task.script) : {}
      const taskWithPlan = task as typeof task & { plan?: { title?: string } }

      return {
        id: task.id,
        customerId: task.customerId,
        customerName: customer?.name || "未知客户",
        customerPhone: customer?.phone,
        customerTags: customer?.tags || [],
        planTitle: taskWithPlan.plan?.title,
        objective: task.goal,
        scriptDirection: scriptData.direction,
        hook: scriptData.hook,
        tone: scriptData.tone,
        scheduledDate: task.scheduledDate,
        status: task.status,
        priority: task.priority,
      }
    })

    // 获取统计数据
    const statsWhere = tenantWhere("FollowUpTask", session, dayWhere)

    const [totalTasks, completedTasks, skippedTasks] = await Promise.all([
      prisma.followUpTask.count({ where: statsWhere }),
      prisma.followUpTask.count({
        where: {
          ...statsWhere,
          status: "done",
        },
      }),
      prisma.followUpTask.count({
        where: {
          ...statsWhere,
          status: "skipped",
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        date,
        tasks: workbenchTasks,
        stats: {
          total: totalTasks,
          completed: completedTasks,
          skipped: skippedTasks,
          pending: totalTasks - completedTasks - skippedTasks,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        },
      },
    })
  } catch (error) {
    console.error("获取每日工作台数据失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取数据失败" } },
      { status: 500 }
    )
  }
}
