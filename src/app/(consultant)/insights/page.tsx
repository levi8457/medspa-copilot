"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Users,
  TrendingUp,
  DollarSign,
  Target,
  Calendar,
  CheckCircle,
  Clock,
  ArrowUpRight,
  PieChart,
} from "lucide-react"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { HudPanel } from "@/components/futuristic/HudPanel"
import { EnergyRing } from "@/components/futuristic/EnergyRing"
import { apiFetch } from "@/lib/api-fetch"

interface OverviewData {
  totalCustomers: number
  conversionRate: string
  totalRevenue: number
  avgOrderValue: string
  newCustomersLast30: number
  pendingTasks: number
  completedTasks: number
}

interface TierItem {
  tier: string
  label: string
  count: number
  color: string
}

interface RecentTask {
  id: string
  title: string
  customerName: string
  customerId: string
  status: string
  scheduledDate: string
}

export default function InsightsPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [tierDistribution, setTierDistribution] = useState<TierItem[]>([])
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiFetch("/api/consultant/insights")
        const result = await res.json()
        if (result.success) {
          setOverview(result.data.overview)
          setTierDistribution(result.data.tierDistribution)
          setRecentTasks(result.data.recentTasks)
        }
      } catch (error) {
        console.error("获取洞察数据失败:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const totalTierCustomers = tierDistribution.reduce((sum, t) => sum + t.count, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <div className="w-10 h-10 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">数据洞察</h1>
        <p className="text-[var(--foreground-secondary)] mt-1 text-sm">您的业绩数据与客户分析</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <HudPanel
          label="客户总数"
          value={overview?.totalCustomers || 0}
          icon={<Users className="w-5 h-5" />}
          trend="up"
          trendValue={`+${overview?.newCustomersLast30 || 0} 近30天`}
          variant="primary"
        />
        <HudPanel
          label="转化率"
          value={`${overview?.conversionRate || 0}%`}
          icon={<Target className="w-5 h-5" />}
          variant="success"
        />
        <HudPanel
          label="累计业绩"
          value={`¥${((overview?.totalRevenue || 0) / 10000).toFixed(1)}万`}
          icon={<DollarSign className="w-5 h-5" />}
          trend="up"
          trendValue={`客单价 ¥${overview?.avgOrderValue ?? 0}`}
          variant="accent"
        />
        <HudPanel
          label="待办任务"
          value={overview?.pendingTasks || 0}
          icon={<Clock className="w-5 h-5" />}
          variant="warning"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <GlowCard className="col-span-2">
          <div className="p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-medium text-[var(--foreground)] flex items-center gap-2">
                <PieChart className="w-5 h-5 text-[var(--primary)]" />
                客户分层分布
              </h2>
              <span className="text-sm text-[var(--foreground-secondary)]">
                共 {totalTierCustomers} 位客户
              </span>
            </div>

            <div className="flex items-center gap-8">
              <div className="relative">
                <EnergyRing
                  value={totalTierCustomers > 0 ? ((tierDistribution[0]?.count || 0) / totalTierCustomers) * 100 : 0}
                  size={180}
                  strokeWidth={20}
                  variant="success"
                  label=""
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-[var(--foreground)]">
                    {tierDistribution[0]?.count || 0}
                  </span>
                  <span className="text-xs text-[var(--foreground-secondary)]">A类客户</span>
                </div>
              </div>

              <div className="flex-1 space-y-3">
                {tierDistribution.map((item) => (
                  <div key={item.tier || "none"} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--foreground)]">{item.label}</span>
                      <span className="text-sm font-medium" style={{ color: item.color }}>
                        {item.count} 人
                        <span className="text-[var(--foreground-secondary)] font-normal ml-2">
                          {totalTierCustomers > 0
                            ? ((item.count / totalTierCustomers) * 100).toFixed(1)
                            : 0}
                          %
                        </span>
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--card)] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width:
                            totalTierCustomers > 0
                              ? `${(item.count / totalTierCustomers) * 100}%`
                              : "0%",
                        }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <div className="p-5">
            <h2 className="text-lg font-medium text-[var(--foreground)] flex items-center gap-2 mb-5">
              <CheckCircle className="w-5 h-5 text-[var(--success)]" />
              任务完成情况
            </h2>

            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="text-4xl font-bold text-[var(--foreground)] mb-1">
                  {overview?.completedTasks || 0}
                </div>
                <div className="text-sm text-[var(--foreground-secondary)]">已完成任务</div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--foreground-secondary)]">待处理</span>
                  <span className="text-[var(--warning)]">{overview?.pendingTasks || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--foreground-secondary)]">已完成</span>
                  <span className="text-[var(--success)]">{overview?.completedTasks || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--foreground-secondary)]">完成率</span>
                  <span className="text-[var(--primary)] font-medium">
                    {((overview?.completedTasks || 0) + (overview?.pendingTasks || 0)) > 0
                      ? (((overview?.completedTasks || 0) /
                          ((overview?.completedTasks || 0) + (overview?.pendingTasks || 0))) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>
        </GlowCard>
      </div>

      <GlowCard>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-[var(--foreground)] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--accent)]" />
              最近跟进任务
            </h2>
          </div>

          <div className="space-y-2">
            {recentTasks.length === 0 ? (
              <div className="text-center py-8 text-[var(--foreground-secondary)]">
                暂无跟进任务
              </div>
            ) : (
              recentTasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--card)]/50 hover:bg-[var(--card)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        task.status === "done"
                          ? "bg-[var(--success)]"
                          : task.status === "pending"
                          ? "bg-[var(--primary)] animate-pulse"
                          : "bg-[var(--foreground-secondary)]"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">{task.title}</p>
                      <p className="text-xs text-[var(--foreground-secondary)]">
                        {task.customerName}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-[var(--foreground-secondary)]">
                    {new Date(task.scheduledDate).toLocaleDateString("zh-CN")}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </GlowCard>
    </div>
  )
}
