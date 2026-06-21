import type { Metadata } from "next"
import { cn } from "@/lib/utils"
import { Providers } from "./providers"
import "./globals.css"

export const metadata: Metadata = {
  title: "MedSpa Copilot — 医美 AI 智能管家",
  description: "医美机构咨询师的 AI 助理：录音解析 → 标签生成 → 跟进策略 → 每日执行",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className={cn("min-h-full flex flex-col bg-[var(--background)]")}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
