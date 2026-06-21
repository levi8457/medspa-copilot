import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { withTenantFilter } from "@/lib/db-tenant"

// GET - 获取每日工作台数据
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0]

  try {
    // 获取今日待跟进任务
    const todayStart = new Date(date)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(date)
    todayEnd.setHours(23, 59, 59, 999)

    const where: Record<string, unknown> = {
      scheduledDate: {
        gte: todayStart,
        lte: todayEnd,
      },
      status: "pending",
    }

    const baseArgs = {
      where,
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
      where: { id: { in: customerIds } },
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
    const todayDate = new Date(date)

    const [totalTasks, completedTasks, skippedTasks] = await Promise.all([
      prisma.followUpTask.count({
        where: {
          ...((args.where as Record<string, unknown>) || {}),
        },
      }),
      prisma.followUpTask.count({
        where: {
          ...((args.where as Record<string, unknown>) || {}),
          status: "done",
        },
      }),
      prisma.followUpTask.count({
        where: {
          ...((args.where as Record<string, unknown>) || {}),
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