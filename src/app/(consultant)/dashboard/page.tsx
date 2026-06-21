import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { HudPanel } from "@/components/futuristic/HudPanel"
import { EnergyRing } from "@/components/futuristic/EnergyRing"
import { TagCapsule } from "@/components/futuristic/TagCapsule"
import { Activity, Users, TrendingUp, Mic } from "lucide-react"
import prisma from "@/lib/db"

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  const { user } = session

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [customerCount, todayTasks, pendingAudios] = await Promise.all([
    prisma.customer.count({
      where: {
        orgId: user.orgId,
        ...(user.role === "consultant" && { consultantId: user.id }),
      },
    }),
    prisma.followUpTask.count({
      where: {
        orgId: user.orgId,
        scheduledDate: today,
        status: "pending",
        ...(user.role === "consultant" && { consultantId: user.id }),
      },
    }),
    prisma.audioRecord.count({
      where: {
        orgId: user.orgId,
        status: "pending",
        ...(user.role === "consultant" && { consultantId: user.id }),
      },
    }),
  ])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">工作台</h2>
        <p className="text-[var(--foreground-secondary)] text-sm">欢迎回来，{user.name || user.phone}</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <HudPanel label="今日跟进" value={todayTasks.toString()} unit="任务" icon={<Activity />} />
        <HudPanel label="客户总数" value={customerCount.toString()} icon={<Users />} />
        <HudPanel label="转化率" value="68.5" unit="%" icon={<TrendingUp />} trend="up" trendValue="+5.2%" />
        <HudPanel label="待解析" value={pendingAudios.toString()} icon={<Mic />} />
      </div>

      <GlowCard variant="primary" className="p-6 mb-8">
        <h3 className="text-lg font-medium mb-4">今日跟进任务</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--background)]/50 border border-[var(--border)]">
            <div className="flex items-center gap-4">
              <EnergyRing value={75} variant="primary" size={50} label="" />
              <div>
                <p className="font-medium">李女士</p>
                <p className="text-sm text-[var(--foreground-secondary)]">发送热玛吉项目介绍</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TagCapsule label="高意向" variant="success" />
              <TagCapsule label="热玛吉" variant="primary" />
            </div>
          </div>
        </div>
      </GlowCard>

      <GlowCard variant="accent" className="p-6">
        <h3 className="text-sm font-medium text-[var(--foreground-secondary)] mb-3">客户标签维度</h3>
        <div className="flex flex-wrap gap-2">
          <TagCapsule label="高预算" variant="success" animated />
          <TagCapsule label="价格敏感" variant="warning" animated />
          <TagCapsule label="热玛吉" variant="primary" animated />
          <TagCapsule label="怕痛" variant="danger" animated />
          <TagCapsule label="对比中" variant="accent" animated />
          <TagCapsule label="果断型" variant="primary" animated />
        </div>
      </GlowCard>
    </div>
  )
}
