import { auth, Session } from "@/lib/auth"
import { redirect } from "next/navigation"
import { NextRequest, NextResponse } from "next/server"

/**
 * 角色层级定义
 */
const ROLE_HIERARCHY = {
  super_admin: 100,
  org_admin: 50,
  consultant: 10,
} as const

type Role = keyof typeof ROLE_HIERARCHY

/**
 * 检查用户是否具有指定角色或更高权限
 */
export function hasRole(session: Session | null, requiredRole: Role): boolean {
  if (!session?.user?.role) return false
  const userLevel = ROLE_HIERARCHY[session.user.role as Role] || 0
  const requiredLevel = ROLE_HIERARCHY[requiredRole]
  return userLevel >= requiredLevel
}

/**
 * 检查用户是否为管理员（super_admin 或 org_admin）
 */
export function isAdmin(session: Session | null): boolean {
  return hasRole(session, "org_admin")
}

/**
 * 检查用户是否为超级管理员
 */
export function isSuperAdmin(session: Session | null): boolean {
  return hasRole(session, "super_admin")
}

/**
 * 服务端页面权限守卫
 * 如果权限不足，重定向到指定页面
 */
export async function requireAuth(
  requiredRole?: Role,
  redirectTo = "/login"
): Promise<Session> {
  const session = await auth()

  if (!session) {
    redirect(redirectTo)
  }

  if (requiredRole && !hasRole(session, requiredRole)) {
    // 根据用户角色重定向到对应页面
    if (session.user.role === "consultant") {
      redirect("/dashboard")
    } else if (session.user.role === "org_admin") {
      redirect("/admin")
    }
    redirect("/unauthorized")
  }

  return session
}

/**
 * API 路由权限守卫
 * 返回 session 或 null
 */
export async function requireApiAuth(
  requiredRole?: Role
): Promise<Session | null> {
  const session = await auth()

  if (!session) {
    return null
  }

  if (requiredRole && !hasRole(session, requiredRole)) {
    return null
  }

  return session
}

/**
 * 中间件：用于保护 API 路由
 */
export async function withAuth(
  request: NextRequest,
  requiredRole?: Role
): Promise<{ session: Session; response?: NextResponse } | { session?: null; response: NextResponse }> {
  const session = await auth()

  if (!session) {
    return {
      response: NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      ),
    }
  }

  if (requiredRole && !hasRole(session, requiredRole)) {
    return {
      response: NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "权限不足" } },
        { status: 403 }
      ),
    }
  }

  return { session }
}

/**
 * 获取路由前缀对应的权限要求
 */
export function getRoutePermission(pathname: string): Role | null {
  // 超级管理员路由
  if (pathname.startsWith("/super-admin")) {
    return "super_admin"
  }

  // 机构管理员路由
  if (pathname.startsWith("/admin")) {
    return "org_admin"
  }

  // 咨询师路由（默认登录即可）
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/customers") || pathname.startsWith("/recordings")) {
    return "consultant"
  }

  return null
}

/**
 * 根据用户角色获取默认跳转路径
 */
export function getDefaultRedirect(role: Role): string {
  switch (role) {
    case "super_admin":
      return "/super-admin"
    case "org_admin":
      return "/admin"
    case "consultant":
    default:
      return "/dashboard"
  }
}
