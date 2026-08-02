"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

const navLinks = [
  { name: "首页", href: "/site" },
  { name: "功能", href: "/site/features" },
  { name: "价格", href: "/site/pricing" },
  { name: "关于", href: "/site/about" },
]

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const particles = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 5,
    }))
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    handleScroll()
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">
      {/* 背景粒子 + 渐变 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 via-transparent to-[var(--accent)]/5" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--primary)]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[var(--accent)]/10 rounded-full blur-3xl" />
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-[var(--primary)]/20"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.x}%`,
              top: `${p.y}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* 导航栏 */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-[var(--background)]/80 backdrop-blur-xl border-b border-[var(--border)]"
            : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/site" className="flex items-center gap-2 group">
              <motion.div
                whileHover={{ rotate: 10, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center"
              >
                <Sparkles className="w-5 h-5 text-[var(--background)]" />
              </motion.div>
              <span className="font-bold text-lg bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent">
                MedSpa AI
              </span>
            </Link>

            {/* 桌面端导航 */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => {
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname?.startsWith(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "text-sm font-medium transition-colors relative",
                      isActive
                        ? "text-[var(--primary)]"
                        : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
                    )}
                  >
                    {link.name}
                    {isActive && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-full"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* CTA 按钮 + 移动端菜单按钮 */}
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground)] font-medium text-sm hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
              >
                登录
              </Link>
              <Link
                href="/trial"
                className="hidden sm:inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--background)] font-medium text-sm hover:opacity-90 transition-opacity"
              >
                免费试用
              </Link>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background-card)] transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* 移动端菜单 */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden bg-[var(--background-card)]/95 backdrop-blur-xl border-b border-[var(--border)]"
            >
              <nav className="px-4 py-4 space-y-2">
                {navLinks.map((link) => {
                  const isActive =
                    link.href === "/"
                      ? pathname === "/"
                      : pathname?.startsWith(link.href)
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                          : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background-card)]"
                      )}
                    >
                      {link.name}
                    </Link>
                  )
                })}
                <Link
                  href="/login"
                  className="block text-center px-4 py-2.5 rounded-lg border border-[var(--border)] text-[var(--foreground)] font-medium text-sm mt-2"
                >
                  登录
                </Link>
                <Link
                  href="/trial"
                  className="block text-center px-4 py-2.5 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--background)] font-medium text-sm mt-2"
                >
                  免费试用
                </Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 relative z-10 pt-16">{children}</main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--border)] bg-[var(--background-card)]/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo + 简介 */}
            <div className="md:col-span-2">
              <Link href="/site" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[var(--background)]" />
                </div>
                <span className="font-bold text-lg bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent">
                  MedSpa AI
                </span>
              </Link>
              <p className="text-sm text-[var(--foreground-secondary)] max-w-md">
                医美 AI 智能管家，为医美机构提供全方位的 AI 赋能解决方案，助力咨询师高效运营，提升客户转化率。
              </p>
            </div>

            {/* 快速链接 */}
            <div>
              <h4 className="font-medium text-[var(--foreground)] mb-4">快速链接</h4>
              <ul className="space-y-2">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--foreground-secondary)] hover:text-[var(--primary)] transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* 联系方式 */}
            <div>
              <h4 className="font-medium text-[var(--foreground)] mb-4">联系我们</h4>
              <ul className="space-y-2 text-sm text-[var(--foreground-secondary)]">
                <li>邮箱：qjkm88@agent.qq.com</li>
                <li>电话：18996270323</li>
                <li>地址：上海市浦东新区</li>
              </ul>
            </div>
          </div>

          {/* 底部版权 */}
          <div className="mt-12 pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[var(--foreground-muted)]">
              © 2026 MedSpa AI. All rights reserved.
            </p>
            <p className="text-xs text-[var(--foreground-muted)]">
              沪ICP备2026000000号-1
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
