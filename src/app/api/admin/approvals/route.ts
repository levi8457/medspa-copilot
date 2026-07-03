import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 审批类型映射
const VALID_TYPES = ["discount", "project_plan", "customer_transfer", "refund"]

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "未登录" } },
        { status: 401 },
      )
    }

    const orgId = session.user.orgId
    const userId = session.user.id
    const role = session.user.role

    const { searchParams } = new URL(request.url)
    const tab = searchParams.get("tab") || "pending"

    const isApprover = role === "org_admin" || role === "super_admin"

    // 构造各 tab 查询条件
    const buildWhere = (t: string) => {
      const base: Record<string, unknown> = { orgId }
      if (t === "applied") {
        base.applicantId = userId
      } else if (t === "completed") {
        base.status = { in: ["approved", "rejected", "cancelled"] }
      } else {
        // pending: 待我审批 —— 仅 org_admin/super_admin 可见，且不是自己发起的
        base.status = "pending"
        if (isApprover) {
          base.applicantId = { not: userId }
        } else {
          // 普通咨询师无审批权限，返回空
          base.applicantId = "__none__"
        }
      }
      return base
    }

    const [pendingWhere, appliedWhere, completedWhere] = [
      buildWhere("pending"),
      buildWhere("applied"),
      buildWhere("completed"),
    ]

    const currentWhere = buildWhere(tab)

    const [items, pendingCount, appliedCount, completedCount] = await Promise.all([
      prisma.approvalFlow.findMany({
        where: currentWhere,
        include: {
          steps: {
            orderBy: { stepOrder: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.approvalFlow.count({ where: pendingWhere }),
      prisma.approvalFlow.count({ where: appliedWhere }),
      prisma.approvalFlow.count({ where: completedWhere }),
    ])

    // 批量查询申请人姓名
    const applicantIds = [...new Set(items.map((i) => i.applicantId))]
    const applicants = await prisma.user.findMany({
      where: { id: { in: applicantIds } },
      select: { id: true, name: true },
    })
    const applicantMap = Object.fromEntries(applicants.map((a) => [a.id, a.name || "未知"]))

    // 批量查询审批人姓名（步骤中 approverId）
    const approverIds = [
      ...new Set(
        items.flatMap((i) =>
          i.steps.map((s) => s.approverId).filter((id): id is string => Boolean(id)),
        ),
      ),
    ]
    const approvers = await prisma.user.findMany({
      where: { id: { in: approverIds } },
      select: { id: true, name: true },
    })
    const approverMap = Object.fromEntries(approvers.map((a) => [a.id, a.name || "未知"]))

    const list = items.map((flow) => {
      const currentStep = flow.steps.find((s) => s.status === "pending") || null
      return {
        id: flow.id,
        type: flow.type,
        title: flow.title,
        applicantId: flow.applicantId,
        applicantName: applicantMap[flow.applicantId] || "未知",
        status: flow.status,
        content: flow.content,
        customerId: flow.customerId,
        amount: flow.amount,
        currentStep: flow.currentStep,
        totalSteps: flow.totalSteps,
        createdAt: flow.createdAt.toISOString(),
        updatedAt: flow.updatedAt.toISOString(),
        currentStepInfo: currentStep
          ? {
              stepOrder: currentStep.stepOrder,
              approverRole: currentStep.approverRole,
              approverName: currentStep.approverId
                ? approverMap[currentStep.approverId]
                : null,
            }
          : null,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        items: list,
        stats: {
          pending: pendingCount,
          applied: appliedCount,
          completed: completedCount,
        },
      },
    })
  } catch (error) {
    console.error("获取审批列表失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取审批列表失败" } },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "未登录" } },
        { status: 401 },
      )
    }

    const body = await request.json()
    const { type, title, content, customerId, amount } = body as {
      type?: string
      title?: string
      content?: unknown
      customerId?: string | null
      amount?: number | null
    }

    // 字段校验
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "审批类型无效" } },
        { status: 400 },
      )
    }
    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "审批标题不能为空" } },
        { status: 400 },
      )
    }

    // content 序列化为 JSON 字符串存储（schema 中 content 为 String?）
    const contentStr =
      content === undefined || content === null
        ? null
        : typeof content === "string"
          ? content
          : JSON.stringify(content)

    // 默认单步审批，由机构管理员审批
    const flow = await prisma.approvalFlow.create({
      data: {
        orgId: session.user.orgId,
        type,
        title: title.trim(),
        applicantId: session.user.id,
        status: "pending",
        content: contentStr,
        customerId: customerId || null,
        amount: typeof amount === "number" ? amount : null,
        currentStep: 1,
        totalSteps: 1,
        steps: {
          create: [
            {
              stepOrder: 1,
              approverId: null,
              approverRole: "org_admin",
              status: "pending",
            },
          ],
        },
      },
      include: {
        steps: { orderBy: { stepOrder: "asc" } },
      },
    })

    return NextResponse.json({ success: true, data: flow })
  } catch (error) {
    console.error("发起审批失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "发起审批失败" } },
      { status: 500 },
    )
  }
}
