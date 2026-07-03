import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generateScript } from "@/lib/ai/generate-script"
import { complianceCheck } from "@/lib/ai/compliance-check"
import { z } from "zod"

// 批量话术生成客户数量上限（同步生成，限制并发与耗时）
const MAX_SCRIPT_BATCH = 10

// 批量话术生成入参
const batchScriptSchema = z.object({
  customerIds: z
    .array(z.string().min(1))
    .min(1, "至少选择一个客户")
    .max(MAX_SCRIPT_BATCH, `单次最多生成 ${MAX_SCRIPT_BATCH} 个客户的话术`),
  scene: z.string().optional(),
  tone: z.string().optional(),
})

// 单客户话术生成结果
interface CustomerScriptResult {
  customerId: string
  customerName: string
  script: string
  subjectLine?: string
  keyPoints?: string[]
  compliancePassed: boolean
  complianceRiskLevel?: string
  complianceWarnings?: string[]
  error?: string
}

export async function POST(request: NextRequest) {
  // 1. 鉴权
  const session = await auth()
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
      { status: 401 }
    )
  }

  // 2. 解析 & 校验入参
  let input: z.infer<typeof batchScriptSchema>
  try {
    const body = await request.json()
    const result = batchScriptSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: result.error.issues[0]?.message ?? "参数校验失败",
          },
        },
        { status: 400 }
      )
    }
    input = result.data
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "请求体格式错误" } },
      { status: 400 }
    )
  }

  const { customerIds, scene, tone } = input
  const { orgId, id: userId, role } = session.user

  // 3. 查询选中的客户，校验全部归属当前机构（咨询师额外校验本人名下）
  const customerWhere: {
    id: { in: string[] }
    orgId: string
    consultantId?: string
  } = {
    id: { in: customerIds },
    orgId,
  }
  if (role === "consultant") {
    customerWhere.consultantId = userId
  }

  const customers = await prisma.customer.findMany({
    where: customerWhere,
    select: { id: true, name: true },
  })

  if (customers.length !== customerIds.length) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "部分客户不存在或无权操作",
        },
      },
      { status: 403 }
    )
  }

  // 4. 批量生成话术（同步顺序执行，单客户失败不影响其他）
  const scripts: CustomerScriptResult[] = []
  for (const customer of customers) {
    try {
      const result = await generateScriptForCustomer(customer.id, customer.name, {
        scene,
        tone,
        orgId,
        userId,
      })
      scripts.push(result)
    } catch (error) {
      console.error(`[batch-scripts] 客户 ${customer.id} 话术生成失败:`, error)
      scripts.push({
        customerId: customer.id,
        customerName: customer.name,
        script: "",
        compliancePassed: false,
        error: "话术生成失败",
      })
    }
  }

  return NextResponse.json({
    success: true,
    data: { scripts },
  })
}

/**
 * 为单个客户生成个性化话术
 * - 拉取客户标签
 * - 调用 DeepSeek 生成话术
 * - 合规过滤后返回前端（未经合规过滤的话术不会到达前端）
 */
async function generateScriptForCustomer(
  customerId: string,
  customerName: string,
  opts: { scene?: string; tone?: string; orgId: string; userId: string }
): Promise<CustomerScriptResult> {
  // 拉取客户标签
  const tags = await prisma.customerTag.findMany({
    where: { customerId, orgId: opts.orgId },
    select: { dimension: true, value: true },
  })

  // 标签转换为对象格式
  const customerTags: Record<string, unknown> = {}
  for (const tag of tags) {
    customerTags[tag.dimension] = tag.value
  }

  // 调用 DeepSeek 生成话术
  const scriptResult = await generateScript({
    customerTags,
    objective: opts.scene || "跟进客户",
    scriptDirection: "",
    hookContent: "",
    tone: opts.tone || "warm",
    customerName: customerName || "客户",
  })

  // 合规过滤 —— 话术必须经过 compliance-check 二次过滤才能返回前端
  const compliance = await complianceCheck({
    script: scriptResult.script,
    customerName: customerName || "客户",
  })

  // 合规审查未通过：拦截话术，不返回给前端
  if (!compliance.passed) {
    return {
      customerId,
      customerName,
      script: "",
      compliancePassed: false,
      complianceRiskLevel: compliance.risk_level,
      complianceWarnings: compliance.violations.map((v) => v.content),
      error: "话术未通过医疗合规审查",
    }
  }

  return {
    customerId,
    customerName,
    script: scriptResult.script,
    subjectLine: scriptResult.subject_line,
    keyPoints: scriptResult.key_points,
    compliancePassed: true,
    complianceRiskLevel: compliance.risk_level,
    complianceWarnings: compliance.violations
      .filter((v) => v.type === "warning")
      .map((v) => v.content),
  }
}
