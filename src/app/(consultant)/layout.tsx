"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Users,
  FileAudio,
  ClipboardList,
  LogOut,
} from "lucide-react"

const navigation = [
  { name: "工作台", href: "/dashboard", icon: Home },
  { name: "客户管理", href: "/customers", icon: Users },
  { name: "录音上传", href: "/recordings/upload", icon: FileAudio },
  { name: "跟进任务", href: "/tasks", icon: ClipboardList },
]

export default function ConsultantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-[var(--background)] flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[var(--border)] bg-[var(--card)]/50 backdrop-blur-xl flex flex-col">
        <div className="p-6">
          <h1 className="font-mono text-xl font-bold tracking-wider text-[var(--primary)]">
            MedSpa
          </h1>
          <p className="text-xs text-[var(--foreground-secondary)] mt-1">AI 智能管家</p>
        </div>

        <nav className="px-4 space-y-1 flex-1">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href)
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

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
