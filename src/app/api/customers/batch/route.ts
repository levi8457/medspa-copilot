import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { z } from "zod"

// 批量操作数量上限
const MAX_BATCH_SIZE = 100

// 客户 ID 列表校验
const customerIdList = z
  .array(z.string().min(1))
  .min(1, "至少选择一个客户")
  .max(MAX_BATCH_SIZE, `单次最多操作 ${MAX_BATCH_SIZE} 个客户`)

// 批量操作入参（按 action 区分 payload）
const batchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("mark_done"),
    customerIds: customerIdList,
    payload: z
      .object({
        taskIds: z.array(z.string().min(1)).optional(),
      })
      .optional(),
  }),
  z.object({
    action: z.literal("mark_skipped"),
    customerIds: customerIdList,
    payload: z
      .object({
        taskIds: z.array(z.string().min(1)).optional(),
      })
      .optional(),
    reason: z.string().min(1, "跳过原因必填"),
  }),
  z.object({
    action: z.literal("add_tag"),
    customerIds: customerIdList,
    payload: z.object({
      tagKey: z.string().min(1, "标签键不能为空"),
      tagValue: z.string().min(1, "标签值不能为空"),
    }),
  }),
  z.object({
    action: z.literal("remove_tag"),
    customerIds: customerIdList,
    payload: z.object({
      tagKey: z.string().min(1, "标签键不能为空"),
      tagValue: z.string().optional(),
    }),
  }),
  z.object({
    action: z.literal("assign"),
    customerIds: customerIdList,
    payload: z.object({
      consultantId: z.string().min(1, "目标咨询师不能为空"),
    }),
  }),
  z.object({
    action: z.literal("create_schedule"),
    customerIds: customerIdList,
    payload: z.object({
      title: z.string().min(1, "日程标题不能为空"),
      type: z.string().min(1, "日程类型不能为空"),
      startTime: z.coerce.date(),
      endTime: z.coerce.date().optional(),
      reminderMinutes: z.number().int().min(0).optional(),
      notes: z.string().optional(),
    }),
  }),
  z.object({
    action: z.literal("delete"),
    customerIds: customerIdList,
  }),
])

type BatchInput = z.infer<typeof batchSchema>
type MarkDoneInput = Extract<BatchInput, { action: "mark_done" }>
type MarkSkippedInput = Extract<BatchInput, { action: "mark_skipped" }>
type AddTagInput = Extract<BatchInput, { action: "add_tag" }>
type RemoveTagInput = Extract<BatchInput, { action: "remove_tag" }>
type AssignInput = Extract<BatchInput, { action: "assign" }>
type CreateScheduleInput = Extract<BatchInput, { action: "create_schedule" }>

// 事务客户端类型
type Tx = Prisma.TransactionClient

// 操作上下文
interface OpCtx {
  orgId: string
  userId: string
  role: "super_admin" | "org_admin" | "consultant"
}

// 批量操作结果
interface BatchResult {
  affected: number
  details: Record<string, unknown>
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
  let input: BatchInput
  try {
    const body = await request.json()
    const parsed = batchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "参数校验失败",
          },
        },
        { status: 400 }
      )
    }
    input = parsed.data
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "请求体格式错误" } },
      { status: 400 }
    )
  }

  const { action, customerIds } = input
  const ctx: OpCtx = {
    orgId: session.user.orgId,
    userId: session.user.id,
    role: session.user.role,
  }

  // 3. 权限前置校验：assign / delete 仅管理员可执行
  if (
    (action === "assign" || action === "delete") &&
    ctx.role === "consultant"
  ) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "FORBIDDEN", message: "当前操作仅机构管理员可执行" },
      },
      { status: 403 }
    )
  }

  // 4. 查询选中的客户，校验全部归属当前机构（咨询师额外校验本人名下）
  const customerWhere: {
    id: { in: string[] }
    orgId: string
    consultantId?: string
  } = {
    id: { in: customerIds },
    orgId: ctx.orgId,
  }
  if (ctx.role === "consultant") {
    customerWhere.consultantId = ctx.userId
  }

  const customers = await prisma.customer.findMany({
    where: customerWhere,
    select: { id: true, consultantId: true, name: true },
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

  // 5. assign 操作前置校验目标咨询师
  let targetConsultant: { id: string; name: string | null } | null = null
  if (input.action === "assign") {
    targetConsultant = await prisma.user.findFirst({
      where: {
        id: input.payload.consultantId,
        orgId: ctx.orgId,
        role: "consultant",
      },
      select: { id: true, name: true },
    })
    if (!targetConsultant) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "目标咨询师不存在或不属于当前机构",
          },
        },
        { status: 404 }
      )
    }
  }

  // 6. 执行批量操作（事务保证原子性）
  try {
    const result = await prisma.$transaction(async (tx) => {
      switch (input.action) {
        case "mark_done":
          return await handleTaskStatus(tx, input, ctx, "done")
        case "mark_skipped":
          return await handleTaskStatus(tx, input, ctx, "skipped")
        case "add_tag":
          return await handleAddTag(tx, input, ctx)
        case "remove_tag":
          return await handleRemoveTag(tx, input, ctx)
        case "assign":
          return await handleAssign(tx, input, ctx, customers, targetConsultant!)
        case "create_schedule":
          return await handleCreateSchedule(tx, input, ctx)
        case "delete":
          return await handleDelete(tx, ctx, customers)
        default: {
          // 穷尽性检查
          const _exhaustive: never = input
          throw new Error(`未支持的操作: ${String(_exhaustive)}`)
        }
      }
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("[batch] 批量操作失败:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "批量操作失败" },
      },
      { status: 500 }
    )
  }
}

// ============ 子操作实现 ============

/**
 * 批量更新跟进任务状态（done / skipped）
 * - 咨询师仅操作本人名下任务
 * - 管理员可操作所选客户的所有 pending 任务
 * - 可通过 taskIds 限定具体任务，否则操作客户所有 pending 任务
 */
async function handleTaskStatus(
  tx: Tx,
  input: MarkDoneInput | MarkSkippedInput,
  ctx: OpCtx,
  newStatus: "done" | "skipped"
): Promise<BatchResult> {
  const taskWhere: {
    orgId: string
    customerId: { in: string[] }
    status: string
    consultantId?: string
    id?: { in: string[] }
  } = {
    orgId: ctx.orgId,
    customerId: { in: input.customerIds },
    status: "pending",
  }

  // 咨询师仅能操作自己的任务
  if (ctx.role === "consultant") {
    taskWhere.consultantId = ctx.userId
  }

  // 可选：限定具体任务
  const taskIds = input.payload?.taskIds
  if (taskIds && taskIds.length > 0) {
    taskWhere.id = { in: taskIds }
  }

  const updateData: {
    status: string
    executedAt: Date
    skipReason?: string
  } = {
    status: newStatus,
    executedAt: new Date(),
  }
  if (newStatus === "skipped" && input.action === "mark_skipped") {
    updateData.skipReason = input.reason
  }

  const result = await tx.followUpTask.updateMany({
    where: taskWhere,
    data: updateData,
  })

  return {
    affected: result.count,
    details: {
      action: input.action,
      status: newStatus,
      taskCount: result.count,
    },
  }
}

/**
 * 批量打标签
 * - 对每个客户 upsert CustomerTag（按 customerId + dimension + value 唯一约束）
 * - 写一条汇总 AuditLog
 */
async function handleAddTag(
  tx: Tx,
  input: AddTagInput,
  ctx: OpCtx
): Promise<BatchResult> {
  const { tagKey, tagValue } = input.payload
  const now = new Date()

  let affected = 0
  for (const customerId of input.customerIds) {
    await tx.customerTag.upsert({
      where: {
        customerId_dimension_value: {
          customerId,
          dimension: tagKey,
          value: tagValue,
        },
      },
      update: {
        isManuallyModified: true,
        modifiedBy: ctx.userId,
        modifiedAt: now,
      },
      create: {
        orgId: ctx.orgId,
        customerId,
        dimension: tagKey,
        value: tagValue,
        isManuallyModified: true,
        modifiedBy: ctx.userId,
        modifiedAt: now,
      },
    })
    affected++
  }

  // 写审计日志（汇总一条）
  await tx.auditLog.create({
    data: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "customer.batch.add_tag",
      resourceType: "CustomerTag",
      newValue: JSON.stringify({
        tagKey,
        tagValue,
        customerIds: input.customerIds,
      }),
    },
  })

  return {
    affected,
    details: { tagKey, tagValue, customerCount: affected },
  }
}

/**
 * 批量移除标签
 * - 删除匹配 dimension（及可选 value）的 CustomerTag
 * - 写一条汇总 AuditLog
 */
async function handleRemoveTag(
  tx: Tx,
  input: RemoveTagInput,
  ctx: OpCtx
): Promise<BatchResult> {
  const { tagKey, tagValue } = input.payload

  const tagWhere: {
    orgId: string
    customerId: { in: string[] }
    dimension: string
    value?: string
  } = {
    orgId: ctx.orgId,
    customerId: { in: input.customerIds },
    dimension: tagKey,
  }
  if (tagValue) {
    tagWhere.value = tagValue
  }

  const result = await tx.customerTag.deleteMany({ where: tagWhere })

  // 写审计日志
  await tx.auditLog.create({
    data: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "customer.batch.remove_tag",
      resourceType: "CustomerTag",
      oldValue: JSON.stringify({
        tagKey,
        tagValue,
        customerIds: input.customerIds,
      }),
    },
  })

  return {
    affected: result.count,
    details: { tagKey, tagValue, removedCount: result.count },
  }
}

/**
 * 批量分配客户（转移咨询师）— 仅管理员
 * - 目标咨询师已在事务外校验
 * - 更新 Customer.consultantId
 * - 写审计日志记录新旧归属
 */
async function handleAssign(
  tx: Tx,
  input: AssignInput,
  ctx: OpCtx,
  customers: { id: string; consultantId: string | null; name: string }[],
  targetConsultant: { id: string; name: string | null }
): Promise<BatchResult> {
  const { consultantId: targetConsultantId } = input.payload

  // 记录旧归属映射（用于审计）
  const oldValueMap = customers.map((c) => ({
    customerId: c.id,
    customerName: c.name,
    oldConsultantId: c.consultantId,
  }))

  // 执行转移
  const result = await tx.customer.updateMany({
    where: { id: { in: input.customerIds }, orgId: ctx.orgId },
    data: { consultantId: targetConsultantId },
  })

  // 写审计日志
  await tx.auditLog.create({
    data: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "customer.batch.assign",
      resourceType: "Customer",
      oldValue: JSON.stringify({
        targetConsultantId,
        previous: oldValueMap,
      }),
      newValue: JSON.stringify({
        targetConsultantId,
        targetConsultantName: targetConsultant.name,
        customerIds: input.customerIds,
      }),
    },
  })

  return {
    affected: result.count,
    details: {
      targetConsultantId,
      targetConsultantName: targetConsultant.name,
      customerCount: result.count,
    },
  }
}

/**
 * 批量创建日程
 * - 为每个客户创建一条 Schedule（执行人作为 consultantId）
 */
async function handleCreateSchedule(
  tx: Tx,
  input: CreateScheduleInput,
  ctx: OpCtx
): Promise<BatchResult> {
  const { title, type, startTime, endTime, reminderMinutes, notes } =
    input.payload

  const schedulesData = input.customerIds.map((customerId) => ({
    orgId: ctx.orgId,
    customerId,
    consultantId: ctx.userId,
    title,
    type,
    startTime,
    endTime: endTime ?? null,
    reminderMinutes: reminderMinutes ?? null,
    notes: notes ?? null,
    status: "pending",
  }))

  const result = await tx.schedule.createMany({ data: schedulesData })

  return {
    affected: result.count,
    details: {
      title,
      type,
      scheduleCount: result.count,
    },
  }
}

/**
 * 批量删除客户 — 仅管理员（硬删除，依赖 schema 级联）
 * - 写审计日志记录被删除的客户
 */
async function handleDelete(
  tx: Tx,
  ctx: OpCtx,
  customers: { id: string; consultantId: string | null; name: string }[]
): Promise<BatchResult> {
  const customerIds = customers.map((c) => c.id)

  // 写审计日志（删除前记录快照）
  await tx.auditLog.create({
    data: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "customer.batch.delete",
      resourceType: "Customer",
      oldValue: JSON.stringify({
        deleted: customers.map((c) => ({
          customerId: c.id,
          customerName: c.name,
          consultantId: c.consultantId,
        })),
      }),
    },
  })

  const result = await tx.customer.deleteMany({
    where: { id: { in: customerIds }, orgId: ctx.orgId },
  })

  return {
    affected: result.count,
    details: { deletedCount: result.count },
  }
}
