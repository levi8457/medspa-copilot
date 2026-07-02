import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { HudPanel } from "@/components/futuristic/HudPanel"
import { EnergyRing } from "@/components/futuristic/EnergyRing"
import { TagCapsule } from "@/components/futuristic/TagCapsule"
import { Activity, Users, TrendingUp, Mic } from "lucide-react"
import prisma from "@/lib/db"

// 标签值 → TagCapsule variant 映射
function tagVariant(value: string): "primary" | "accent" | "success" | "warning" | "danger" {
  const v = value.toLowerCase()
  if (/高|意向|满意|果断|预算/.test(v)) return "success"
  if (/敏感|怕|痛|顾虑|犹豫/.test(v)) return "warning"
  if (/流失|风险|流失|差/.test(v)) return "danger"
  if (/对比|考虑/.test(v)) return "accent"
  return "primary"
}

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  const { user } = session

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const consultantFilter = user.role === "consultant" ? { consultantId: user.id } : {}

  const [customerCount, todayTasksCount, pendingAudios, todayTaskList, tagDimensions, convertedCount] = await Promise.all([
    prisma.customer.count({
      where: {
        orgId: user.orgId,
        ...consultantFilter,
      },
    }),
    prisma.followUpTask.count({
      where: {
        orgId: user.orgId,
        scheduledDate: today,
        status: "pending",
        ...consultantFilter,
      },
    }),
    prisma.audioRecord.count({
      where: {
        orgId: user.orgId,
        status: "pending",
        ...consultantFilter,
      },
    }),
    // 今日待跟进任务（含客户信息和标签）
    prisma.followUpTask.findMany({
      where: {
        orgId: user.orgId,
        scheduledDate: today,
        status: "pending",
        ...consultantFilter,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            tags: {
              select: { dimension: true, value: true },
              take: 3,
            },
          },
        },
      },
      orderBy: { priority: "desc" },
      take: 5,
    }),
    // 客户标签维度统计
    prisma.customerTag.findMany({
      where: {
        orgId: user.orgId,
        customer: consultantFilter,
      },
      select: { dimension: true, value: true },
      distinct: ["dimension"],
    }),
    // 已成交客户数
    prisma.customer.count({
      where: {
        orgId: user.orgId,
        status: "converted",
        ...consultantFilter,
      },
    }),
  ])

  // 计算转化率
  const conversionRate = customerCount > 0 ? (convertedCount / customerCount) * 100 : 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">工作台</h2>
        <p className="text-[var(--foreground-secondary)] text-sm">欢迎回来，{user.name || user.phone}</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <HudPanel label="今日跟进" value={todayTasksCount.toString()} unit="任务" icon={<Activity />} />
        <HudPanel label="客户总数" value={customerCount.toString()} icon={<Users />} />
        <HudPanel label="转化率" value={conversionRate.toFixed(1)} unit="%" icon={<TrendingUp />} />
        <HudPanel label="待解析" value={pendingAudios.toString()} icon={<Mic />} />
      </div>

      <GlowCard variant="primary" className="p-6 mb-8">
        <h3 className="text-lg font-medium mb-4">今日跟进任务</h3>
        <div className="space-y-4">
          {todayTaskList.length === 0 ? (
            <p className="text-sm text-[var(--foreground-secondary)] py-4 text-center">今日暂无跟进任务</p>
          ) : (
            todayTaskList.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 rounded-lg bg-[var(--background)]/50 border border-[var(--border)]"
              >
                <div className="flex items-center gap-4">
                  <EnergyRing value={task.priority * 20} variant="primary" size={50} label="" />
                  <div>
                    <p className="font-medium">{task.customer.name}</p>
                    <p className="text-sm text-[var(--foreground-secondary)]">{task.goal || "跟进客户"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {task.customer.tags.map((tag) => (
                    <TagCapsule key={tag.dimension} label={tag.value} variant={tagVariant(tag.value)} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </GlowCard>

      <GlowCard variant="accent" className="p-6">
        <h3 className="text-sm font-medium text-[var(--foreground-secondary)] mb-3">客户标签维度</h3>
        <div className="flex flex-wrap gap-2">
          {tagDimensions.length === 0 ? (
            <p className="text-sm text-[var(--foreground-secondary)]">暂无标签数据</p>
          ) : (
            tagDimensions.map((tag) => (
              <TagCapsule key={tag.dimension} label={tag.value} variant={tagVariant(tag.value)} animated />
            ))
          )}
        </div>
      </GlowCard>
    </div>
  )
}
