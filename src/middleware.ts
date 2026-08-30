import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth/auth.config"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Edge-compatible auth instance (no Prisma, no bcrypt)
const { auth } = NextAuth(authConfig)

// 公开路由（无需登录，路径已剥离 basePath）
const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/api/auth",
  "/api/health",
  "/api/plans",
  "/api/trial",
  "/site",
  "/trial",
  "/partner-policy",
  "/privacy",
]

// 根据角色重定向（返回不带 basePath 的路径）
function getRedirectPath(role: string): string {
  switch (role) {
    case "super_admin":
      return "/platform"
    case "org_admin":
      return "/admin/overview"
    case "consultant":
    default:
      return "/dashboard"
  }
}

// 构造带 basePath 的重定向 URL
// 使用 request.nextUrl.clone() 确保 basePath 被保留
function buildRedirectUrl(request: NextRequest, pathname: string): URL {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = ""
  return url
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

  // 已登录用户访问登录/注册页，重定向到对应页面
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register")
  if (isAuthPage && session) {
    const redirectPath = getRedirectPath(session.user.role)
    return NextResponse.redirect(buildRedirectUrl(request, redirectPath))
  }

  // 未登录用户访问受保护路由，重定向到登录页
  if (!isPublicRoute && !session) {
    const loginUrl = buildRedirectUrl(request, "/login")
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 角色权限检查
  if (session) {
    const { role } = session.user

    // 超级管理员路由
    if (pathname.startsWith("/super-admin") && role !== "super_admin") {
      return NextResponse.redirect(buildRedirectUrl(request, getRedirectPath(role)))
    }

    // 机构管理员路由
    if (pathname.startsWith("/admin") && role !== "org_admin" && role !== "super_admin") {
      return NextResponse.redirect(buildRedirectUrl(request, getRedirectPath(role)))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // 排除：静态资源、Next 内部、各类静态文件扩展名
    "/((?!_next/static|_next/image|favicon.ico|public/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|json|webp|xml|txt|woff|woff2|css|js|map)$).*)",
  ],
}
