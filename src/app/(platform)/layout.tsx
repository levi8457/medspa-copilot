"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Building2, CreditCard, Receipt, BarChart3, Brain, ShieldAlert, Settings, LogOut } from "lucide-react"

const navigation = [
  { name: "平台总览", href: "/platform", icon: LayoutDashboard },
  { name: "机构管理", href: "/platform/organizations", icon: Building2 },
  { name: "套餐管理", href: "/platform/billing/plans", icon: CreditCard },
  { name: "订单管理", href: "/platform/billing/orders", icon: Receipt },
  { name: "用量统计", href: "/platform/billing/usage", icon: BarChart3 },
  { name: "AI 配置", href: "/platform/ai-config", icon: Brain },
  { name: "监控告警", href: "/platform/monitoring", icon: ShieldAlert },
  { name: "系统设置", href: "/platform/settings", icon: Settings },
]

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-[var(--background)] flex">
      <aside className="w-64 border-r border-[var(--border)] bg-[var(--background-card)] backdrop-blur-xl flex flex-col relative">
        <div className="p-6">
          <h1 className="font-mono text-xl font-bold tracking-wider text-[var(--primary)]">
            MedSpa
          </h1>
          <p className="text-xs text-[var(--foreground-secondary)] mt-1">平台管理</p>
        </div>

        <nav className="px-4 space-y-1 flex-1">
          {navigation.map((item) => {
            const isActive =
              item.href === "/platform"
                ? pathname === "/platform"
                : pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "text-[var(--foreground-secondary)] hover:bg-[var(--border)] hover:text-[var(--foreground)]"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-[var(--border)]">
          <Link
            href="/api/auth/signout"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[var(--foreground-secondary)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            退出登录
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
