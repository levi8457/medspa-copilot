import { Prisma } from "@prisma/client"
import type { Session } from "next-auth"

/**
 * 多租户数据隔离中间件
 * 所有业务查询自动注入 orgId 过滤条件
 */

// 需要多租户过滤的模型列表
const TENANT_MODELS = [
  "Customer",
  "CustomerTag",
  "AudioRecord",
  "FollowUpPlan",
  "FollowUpTask",
  "TimelineEvent",
  "ConsumptionRecord",
  "SopTemplate",
  "TagSchema",
  "AuditLog",
  "User",
]

// 需要额外校验 consultantId 的模型
const CONSULTANT_MODELS = ["Customer", "AudioRecord", "FollowUpTask"]

/**
 * 创建带多租户过滤的 Prisma 查询参数
 */
export function withTenantFilter<M extends Prisma.ModelName>(
  model: M,
  session: Session | null,
  args: Record<string, unknown> = {}
): Record<string, unknown> {
  if (!session?.user?.orgId) {
    throw new Error("未授权访问：缺少机构信息")
  }

  const orgId = session.user.orgId
  const userId = session.user.id
  const role = session.user.role

  // 超级管理员可以查看所有数据
  if (role === "super_admin") {
    return args
  }

  // 构建 where 条件
  const where = (args.where as Record<string, unknown>) || {}

  // 注入 orgId 过滤
  if (TENANT_MODELS.includes(model)) {
    where.orgId = orgId
  }

  // 咨询师只能查看自己的客户相关数据
  if (role === "consultant" && CONSULTANT_MODELS.includes(model)) {
    if (model === "Customer") {
      where.consultantId = userId
    } else if (model === "AudioRecord") {
      where.consultantId = userId
    } else if (model === "FollowUpTask") {
      where.consultantId = userId
    }
  }

  return { ...args, where }
}

/**
 * 验证资源归属
 * 用于更新/删除操作前校验数据归属
 */
export async function validateResourceOwnership(
  model: "Customer" | "AudioRecord" | "FollowUpTask" | "SopTemplate",
  resourceId: string,
  session: Session
): Promise<boolean> {
  if (!session?.user?.orgId) {
    return false
  }

  const { prisma } = await import("./db")
  const orgId = session.user.orgId
  const userId = session.user.id
  const role = session.user.role

  // 超级管理员拥有所有权限
  if (role === "super_admin") {
    return true
  }

  // 根据模型类型查询
  let resource: Record<string, unknown> | null = null

  switch (model) {
    case "Customer":
      resource = await prisma.customer.findUnique({
        where: { id: resourceId },
        select: { orgId: true, consultantId: true },
      })
      break
    case "AudioRecord":
      resource = await prisma.audioRecord.findUnique({
        where: { id: resourceId },
        select: { orgId: true, consultantId: true },
      })
      break
    case "FollowUpTask":
      resource = await prisma.followUpTask.findUnique({
        where: { id: resourceId },
        select: { orgId: true, consultantId: true },
      })
      break
    case "SopTemplate":
      resource = await prisma.sopTemplate.findUnique({
        where: { id: resourceId },
        select: { orgId: true, creatorId: true },
      })
      break
  }

  if (!resource) {
    return false
  }

  // 校验机构归属
  if (resource.orgId !== orgId) {
    return false
  }

  // 咨询师只能操作自己的资源
  if (role === "consultant") {
    if (model === "Customer" || model === "AudioRecord" || model === "FollowUpTask") {
      if ((resource as { consultantId?: string }).consultantId !== userId) {
        return false
      }
    }
    if (model === "SopTemplate") {
      if ((resource as { creatorId?: string }).creatorId !== userId) {
        return false
      }
    }
  }

  return true
}

/**
 * 获取当前用户的 orgId
 */
export function getOrgId(session: Session | null): string {
  if (!session?.user?.orgId) {
    throw new Error("未授权访问：缺少机构信息")
  }
  return session.user.orgId
}

/**
 * 获取当前用户的 userId
 */
export function getUserId(session: Session | null): string {
  if (!session?.user?.id) {
    throw new Error("未授权访问：缺少用户信息")
  }
  return session.user.id
}

/**
 * 检查用户是否有权限执行某操作
 */
export function hasPermission(
  session: Session | null,
  requiredRole: "super_admin" | "org_admin" | "consultant"
): boolean {
  if (!session?.user?.role) {
    return false
  }

  const roleHierarchy = {
    super_admin: 3,
    org_admin: 2,
    consultant: 1,
  }

  const userLevel = roleHierarchy[session.user.role as keyof typeof roleHierarchy] || 0
  const requiredLevel = roleHierarchy[requiredRole]

  return userLevel >= requiredLevel
}

/**
 * 检查是否为管理员角色
 */
export function isAdmin(session: Session | null): boolean {
  return session?.user?.role === "super_admin" || session?.user?.role === "org_admin"
}
