import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 获取审批详情（含所有步骤）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "未登录" } },
        { status: 401 },
      )
    }

    const { id } = await params

    const flow = await prisma.approvalFlow.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { stepOrder: "asc" } },
      },
    })

    if (!flow) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "审批不存在" } },
        { status: 404 },
      )
    }

    // 权限校验：orgId 必须匹配 session
    if (flow.orgId !== session.user.orgId) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "无权访问此审批" } },
        { status: 403 },
      )
    }

    // 查询申请人 + 审批人姓名
    const userIds = [
      ...new Set([
        flow.applicantId,
        ...flow.steps
          .map((s) => s.approverId)
          .filter((uid): uid is string => Boolean(uid)),
      ]),
    ]
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    })
    const userMap = Object.fromEntries(users.map((u) => [u.id, u.name || "未知"]))

    const currentStep = flow.steps.find((s) => s.status === "pending") || null

    const data = {
      id: flow.id,
      type: flow.type,
      title: flow.title,
      applicantId: flow.applicantId,
      applicantName: userMap[flow.applicantId] || "未知",
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
              ? userMap[currentStep.approverId]
              : null,
          }
        : null,
      steps: flow.steps.map((s) => ({
        id: s.id,
        stepOrder: s.stepOrder,
        approverId: s.approverId,
        approverName: s.approverId ? userMap[s.approverId] : null,
        approverRole: s.approverRole,
        status: s.status,
        comment: s.comment,
        approvedAt: s.approvedAt ? s.approvedAt.toISOString() : null,
      })),
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("获取审批详情失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取审批详情失败" } },
      { status: 500 },
    )
  }
}
// 审批操作：通过 / 驳回
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "未登录" } },
        { status: 401 },
      )
    }

    const { id } = await params
    const body = await request.json()
    const { action, comment } = body as { action?: string; comment?: string }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "操作类型无效" } },
        { status: 400 },
      )
    }

    // 驳回必须填写驳回意见
    if (action === "reject" && (!comment || !comment.trim())) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "驳回必须填写意见" } },
        { status: 400 },
      )
    }

    const flow = await prisma.approvalFlow.findUnique({
      where: { id },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    })

    if (!flow) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "审批不存在" } },
        { status: 404 },
      )
    }

    // 权限校验：orgId 必须匹配 session
    if (flow.orgId !== session.user.orgId) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "无权操作此审批" } },
        { status: 403 },
      )
    }

    // 仅机构管理员/超级管理员可审批，且不能审批自己发起的
    if (session.user.role === "consultant") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "无审批权限" } },
        { status: 403 },
      )
    }
    if (flow.applicantId === session.user.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "不能审批自己发起的申请" } },
        { status: 403 },
      )
    }

    if (flow.status !== "pending") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_STATE", message: "该审批已处理，无法重复操作" } },
        { status: 400 },
      )
    }

    // 当前待处理步骤
    const currentStep = flow.steps.find(
      (s) => s.stepOrder === flow.currentStep && s.status === "pending",
    )
    if (!currentStep) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_STATE", message: "未找到当前待审批步骤" } },
        { status: 400 },
      )
    }

    const now = new Date()
    const trimmedComment = comment?.trim() || null

    if (action === "approve") {
      // 通过：更新当前步骤
      await prisma.approvalStep.update({
        where: { id: currentStep.id },
        data: {
          status: "approved",
          approverId: session.user.id,
          comment: trimmedComment,
          approvedAt: now,
        },
      })

      // 是否还有下一步
      const nextStep = flow.steps.find(
        (s) => s.stepOrder === flow.currentStep + 1,
      )

      if (nextStep) {
        // 激活下一步
        await prisma.approvalFlow.update({
          where: { id },
          data: { currentStep: nextStep.stepOrder },
        })
        await prisma.approvalStep.update({
          where: { id: nextStep.id },
          data: { status: "pending" },
        })
      } else {
        // 整个审批完成
        await prisma.approvalFlow.update({
          where: { id },
          data: { status: "approved" },
        })
      }
    } else {
      // 驳回：当前步骤和整个审批改为 rejected
      await prisma.approvalStep.update({
        where: { id: currentStep.id },
        data: {
          status: "rejected",
          approverId: session.user.id,
          comment: trimmedComment,
          approvedAt: now,
        },
      })
      await prisma.approvalFlow.update({
        where: { id },
        data: { status: "rejected" },
      })
    }

    // 返回最新详情
    const updated = await prisma.approvalFlow.findUnique({
      where: { id },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("审批操作失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "审批操作失败" } },
      { status: 500 },
    )
  }
}