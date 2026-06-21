import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { validateResourceOwnership } from "@/lib/db-tenant"
import { generateScript } from "@/lib/ai/generate-script"

// POST - 生成跟进话术
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { taskId, customerId } = body

    if (!taskId || !customerId) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_PARAMS", message: "缺少必要参数" } },
        { status: 400 }
      )
    }

    // 验证任务归属
    const hasAccess = await validateResourceOwnership("FollowUpTask", taskId, session)
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "无权操作此任务" } }, { status: 403 })
    }

    // 获取任务详情
    const task = await prisma.followUpTask.findUnique({
      where: { id: taskId },
      include: {
        plan: {
          select: { strategy: true },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ success: false, error: { code: "TASK_NOT_FOUND", message: "任务不存在" } }, { status: 404 })
    }

    // 获取客户标签
    const tags = await prisma.customerTag.findMany({
      where: { customerId, orgId: session.user.orgId },
    })

    // 转换标签为对象格式
    const customerTags: Record<string, unknown> = {}
    for (const tag of tags) {
      customerTags[tag.dimension] = tag.value
    }

    // 获取客户信息
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { name: true },
    })

    // 解析任务脚本数据
    const scriptData = task.script ? JSON.parse(task.script) : {}

    // 生成话术
    const scriptResult = await generateScript({
      customerTags,
      objective: task.goal || "跟进客户",
      scriptDirection: scriptData.direction || "",
      hookContent: scriptData.hook?.content || "",
      tone: scriptData.tone || "warm",
      customerName: customer?.name || "客户",
    })

    return NextResponse.json({
      success: true,
      data: {
        script: scriptResult.script,
        subjectLine: scriptResult.subject_line,
        keyPoints: scriptResult.key_points,
        compliancePassed: scriptResult.compliance_check.passed,
        complianceWarnings: scriptResult.compliance_check.warnings,
      },
    })
  } catch (error) {
    console.error("生成话术失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "话术生成失败，请稍后重试" } },
      { status: 500 }
    )
  }
}