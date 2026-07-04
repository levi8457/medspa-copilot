import type { Metadata, Viewport } from "next"
import { cn } from "@/lib/utils"
import { Providers } from "./providers"
import "./globals.css"

export const metadata: Metadata = {
  title: "MedSpa Copilot — 医美 AI 智能管家",
  description: "医美机构咨询师的 AI 助理：录音解析 → 标签生成 → 跟进策略 → 每日执行",
  manifest: "/medspa/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MedSpa AI",
  },
  icons: {
    icon: [
      { url: "/medspa/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/medspa/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/medspa/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/medspa/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
}

export const viewport: Viewport = {
  themeColor: "#00E5FF",
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
