import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth/auth.config"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Edge-compatible auth instance (no Prisma, no bcrypt)
const { auth } = NextAuth(authConfig)

// 公开路由（无需登录）
const PUBLIC_ROUTES = ["/login", "/register", "/api/auth"]

// 根据角色重定向
function getRedirectPath(role: string): string {
  switch (role) {
    case "super_admin":
      return "/admin/overview"
    case "org_admin":
      return "/admin/overview"
    case "consultant":
    default:
      return "/dashboard"
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = await auth()

  // 检查是否为公开路由
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))

  // 登出接口必须始终放行，否则已登录用户会被重定向走
  if (pathname.startsWith("/api/auth/signout")) {
    return NextResponse.next()
  }

  // 已登录用户访问登录页，重定向到对应页面
  if (isPublicRoute && session) {
    const redirectPath = getRedirectPath(session.user.role)
    return NextResponse.redirect(new URL(redirectPath, request.url))
  }

  // 未登录用户访问受保护路由，重定向到登录页
  if (!isPublicRoute && !session) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 角色权限检查
  if (session) {
    const { role } = session.user

    // 超级管理员路由
    if (pathname.startsWith("/super-admin") && role !== "super_admin") {
      return NextResponse.redirect(new URL(getRedirectPath(role), request.url))
    }

    // 机构管理员路由
    if (pathname.startsWith("/admin") && role !== "org_admin" && role !== "super_admin") {
      return NextResponse.redirect(new URL(getRedirectPath(role), request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}
