import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { validateResourceOwnership } from "@/lib/db-tenant"
import { generateStrategy } from "@/lib/ai/generate-strategy"

// POST - 为客户生成跟进策略
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { customerId, sopTemplateId } = body

    if (!customerId) {
      return NextResponse.json({ success: false, error: { code: "NO_CUSTOMER", message: "请选择客户" } }, { status: 400 })
    }

    // 验证客户归属
    const hasAccess = await validateResourceOwnership("Customer", customerId, session)
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "无权操作此客户" } }, { status: 403 })
    }

    // 获取客户标签
    const tags = await prisma.customerTag.findMany({
      where: { customerId, orgId: session.user.orgId },
    })

    if (tags.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "NO_TAGS", message: "客户暂无标签数据，请先上传录音进行解析" } },
        { status: 400 }
      )
    }

    // 转换标签为对象格式
    const customerTags: {
      basic_info: { age_range?: string; gender?: string; occupation?: string; location?: string }
      spending_power: { budget_range?: string; price_sensitivity?: string; payment_signal?: string }
      demand_intent: Array<{ project: string; urgency: string; decision_stage: string; evidence: string }>
      concerns: Array<{ type: string; detail: string; evidence: string }>
      personality: { decision_style?: string; communication_preference?: string }
      repurchase_potential: { lifecycle_stage?: string; related_projects?: Array<{ project: string; reason: string }> }
    } = {
      basic_info: {},
      spending_power: {},
      demand_intent: [],
      concerns: [],
      personality: {},
      repurchase_potential: {},
    }

    for (const tag of tags) {
      switch (tag.dimension) {
        case "年龄段":
          customerTags.basic_info.age_range = tag.value
          break
        case "性别":
          customerTags.basic_info.gender = tag.value === "女" ? "female" : "male"
          break
        case "职业":
          customerTags.basic_info.occupation = tag.value
          break
        case "预算区间":
          customerTags.spending_power.budget_range = tag.value
          break
        case "价格敏感度":
          customerTags.spending_power.price_sensitivity = tag.value
          break
        case "需求意向":
          customerTags.demand_intent.push({
            project: tag.value.split("(")[0],
            urgency: tag.value.includes("高意向") ? "high" : tag.value.includes("中意向") ? "medium" : "low",
            decision_stage: "decision",
            evidence: tag.sourceText || "",
          })
          break
        case "顾虑点":
          customerTags.concerns.push({
            type: tag.value.split(":")[0],
            detail: tag.value.split(":")[1] || tag.value,
            evidence: tag.sourceText || "",
          })
          break
        case "决策风格":
          customerTags.personality.decision_style = tag.value
          break
        case "客户阶段":
          customerTags.repurchase_potential.lifecycle_stage = tag.value
          break
      }
    }

    // 获取 SOP 模板（如果有指定）
    let sopTemplate: Record<string, unknown> | undefined
    if (sopTemplateId) {
      const sop = await prisma.sopTemplate.findUnique({
        where: { id: sopTemplateId },
      })
      if (sop) {
        sopTemplate = JSON.parse(sop.stages)
      }
    }

    // 生成跟进策略
    const strategy = await generateStrategy({
      customerTags,
      consultantNotes: "",
      sopTemplate,
    })

    // 如果策略不可行，直接返回
    if (!strategy.plan_feasible) {
      return NextResponse.json({
        success: true,
        data: {
          feasible: false,
          reason: strategy.infeasible_reason,
          summary: strategy.strategy_summary,
        },
      })
    }

    // 创建跟进计划
    const plan = await prisma.followUpPlan.create({
      data: {
        orgId: session.user.orgId,
        customerId,
        title: `${strategy.primary_project}跟进策略`,
        description: strategy.strategy_summary,
        strategy: JSON.stringify(strategy),
        status: "active",
      },
    })

    // 创建跟进任务
    const tasks = strategy.follow_ups.map((fu) => ({
      orgId: session.user.orgId,
      planId: plan.id,
      customerId,
      consultantId: session.user.id,
      scheduledDate: new Date(fu.scheduled_date),
      priority: fu.day_offset,
      goal: fu.objective,
      script: JSON.stringify({
        direction: fu.script_direction,
        hook: fu.hook,
        tone: fu.tone,
      }),
      status: "pending",
    }))

    await prisma.followUpTask.createMany({ data: tasks })

    return NextResponse.json({
      success: true,
      data: {
        feasible: true,
        planId: plan.id,
        summary: strategy.strategy_summary,
        rhythm: strategy.overall_rhythm,
        followUpCount: strategy.follow_ups.length,
        riskWarnings: strategy.risk_warnings,
      },
    })
  } catch (error) {
    console.error("生成跟进策略失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "策略生成失败，请稍后重试" } },
      { status: 500 }
    )
  }
}