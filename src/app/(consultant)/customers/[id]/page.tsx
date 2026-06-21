import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import prisma from "@/lib/db"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { TagCapsule } from "@/components/futuristic/TagCapsule"
import { EnergyRing } from "@/components/futuristic/EnergyRing"
import { CustomerTagsSection } from "@/components/CustomerTagsSection"
import { StrategyProgress } from "@/components/StrategyProgress"
import { AudioPlayer } from "@/components/AudioPlayer"
import {
  Phone,
  MessageCircle,
  Calendar,
  FileAudio,
  ShoppingBag,
  Clock,
  Edit,
  ArrowLeft,
  Plus,
} from "lucide-react"
import Link from "next/link"

const statusMap: Record<string, { label: string; color: string }> = {
  lead: { label: "线索", color: "var(--accent)" },
  contacted: { label: "已联系", color: "var(--primary)" },
  negotiating: { label: "洽谈中", color: "var(--warning)" },
  converted: { label: "已成交", color: "var(--success)" },
  churned: { label: "已流失", color: "var(--danger)" },
}

const timelineIcons: Record<string, React.ReactNode> = {
  recording: <FileAudio className="w-4 h-4" />,
  wechat: <MessageCircle className="w-4 h-4" />,
  visit: <Calendar className="w-4 h-4" />,
  deal: <ShoppingBag className="w-4 h-4" />,
  note: <Clock className="w-4 h-4" />,
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) {
    redirect("/login")
  }

  const { id } = await params

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      tags: true,
      audioRecords: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      followUpPlans: {
        include: {
          tasks: {
            orderBy: { scheduledDate: "asc" },
            take: 10,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      },
      timelineEvents: {
        orderBy: { occurredAt: "desc" },
        take: 20,
      },
      consumptionRecords: {
        orderBy: { consumedAt: "desc" },
        take: 10,
      },
      consultant: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
  })

  if (!customer) {
    notFound()
  }

  if (session.user.role === "consultant" && customer.consultantId !== session.user.id) {
    redirect("/customers")
  }

  if (customer.orgId !== session.user.orgId) {
    redirect("/customers")
  }

  const statusInfo = statusMap[customer.status] || statusMap.lead
  const intentTag = customer.tags.find((t) => t.dimension === "需求意向")
  const intentValue = intentTag?.value === "高意向" ? 80 : intentTag?.value === "中等意向" ? 50 : 30

  return (
    <div className="p-8">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/customers"
            className="flex items-center gap-2 text-[var(--foreground-secondary)] hover:text-[var(--primary)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回
          </Link>
          <h1 className="font-mono text-2xl font-bold tracking-wider text-[var(--primary)]">
            客户详情
          </h1>
        </div>
        <Link
          href={`/customers/${id}/edit`}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)]/20 text-[var(--primary)] hover:bg-[var(--primary)]/30 transition-colors"
        >
          <Edit className="w-4 h-4" />
          编辑
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <GlowCard variant="primary" className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <EnergyRing
                value={intentValue}
                variant={intentValue > 60 ? "success" : intentValue > 30 ? "warning" : "accent"}
                size={80}
                label="意向度"
              />
              <div>
                <h2 className="text-xl font-bold">{customer.name}</h2>
                <span
                  className="inline-block px-2 py-0.5 rounded text-xs mt-1"
                  style={{ backgroundColor: `${statusInfo.color}20`, color: statusInfo.color }}
                >
                  {statusInfo.label}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              {customer.phone && (
                <div className="flex items-center gap-2 text-[var(--foreground-secondary)]">
                  <Phone className="w-4 h-4" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.wechat && (
                <div className="flex items-center gap-2 text-[var(--foreground-secondary)]">
                  <MessageCircle className="w-4 h-4" />
                  <span>{customer.wechat}</span>
                </div>
              )}
              {customer.age && (
                <div className="flex items-center gap-2 text-[var(--foreground-secondary)]">
                  <span className="w-4 text-center">{customer.age}岁</span>
                </div>
              )}
              {customer.gender && (
                <div className="flex items-center gap-2 text-[var(--foreground-secondary)]">
                  <span>{customer.gender}</span>
                </div>
              )}
              {customer.source && (
                <div className="flex items-center gap-2 text-[var(--foreground-secondary)]">
                  <span>来源：{customer.source}</span>
                </div>
              )}
              {customer.consultant && (
                <div className="flex items-center gap-2 text-[var(--foreground-secondary)]">
                  <span>咨询师：{customer.consultant.name}</span>
                </div>
              )}
            </div>

            {customer.notes && (
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <p className="text-sm text-[var(--foreground-secondary)]">{customer.notes}</p>
              </div>
            )}
          </GlowCard>

          <GlowCard variant="accent" className="p-6">
            <CustomerTagsSection
              customerId={customer.id}
              initialTags={customer.tags.map((t) => ({
                id: t.id,
                dimension: t.dimension,
                value: t.value,
                sourceText: t.sourceText || undefined,
                audioRecordId: t.audioRecordId || undefined,
                isManuallyModified: t.isManuallyModified,
              }))}
            />
          </GlowCard>

          <GlowCard variant="success" className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-[var(--foreground-secondary)]">消费记录</h3>
              <span className="text-lg font-bold text-[var(--success)]">
                ¥{customer.consumptionRecords.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
              </span>
            </div>
            {customer.consumptionRecords.length > 0 ? (
              <div className="space-y-2">
                {customer.consumptionRecords.slice(0, 3).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between text-sm py-2 border-b border-[var(--border)] last:border-0"
                  >
                    <span className="text-[var(--foreground-secondary)]">
                      {new Date(record.consumedAt).toLocaleDateString()}
                    </span>
                    <span className="font-medium">¥{record.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--foreground-secondary)]">暂无消费记录</p>
            )}
          </GlowCard>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <GlowCard variant="primary" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">跟进任务</h3>
              <button className="flex items-center gap-1 text-sm text-[var(--primary)] hover:underline">
                <Plus className="w-4 h-4" />
                新建任务
              </button>
            </div>
            {customer.followUpPlans.length > 0 ? (
              <div className="space-y-4">
                {customer.followUpPlans.map((plan) => {
                  const completedTasks = plan.tasks.filter((t) => t.status === "done").length
                  const totalTasks = plan.tasks.length
                  return (
                    <div key={plan.id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[var(--foreground)]">{plan.title}</span>
                        <StrategyProgress completed={completedTasks} total={totalTasks} className="w-32" />
                      </div>
                      {plan.tasks.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-[var(--background)]/50 border border-[var(--border)]"
                        >
                          <div>
                            <p className="font-medium">{task.goal || "跟进任务"}</p>
                            <p className="text-sm text-[var(--foreground-secondary)]">
                              {new Date(task.scheduledDate).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              task.status === "done"
                                ? "bg-[var(--success)]/20 text-[var(--success)]"
                                : task.status === "pending"
                                ? "bg-[var(--warning)]/20 text-[var(--warning)]"
                                : "bg-[var(--foreground-secondary)]/20 text-[var(--foreground-secondary)]"
                            }`}
                          >
                            {task.status === "done" ? "已完成" : task.status === "pending" ? "待处理" : "已跳过"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-[var(--foreground-secondary)]">暂无跟进任务</p>
            )}
          </GlowCard>

          <GlowCard variant="accent" className="p-6">
            <h3 className="text-lg font-medium mb-4">客户时间线</h3>
            {customer.timelineEvents.length > 0 ? (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--border)]" />
                <div className="space-y-4">
                  {customer.timelineEvents.map((event) => (
                    <div key={event.id} className="relative pl-10">
                      <div className="absolute left-2 top-1 w-4 h-4 rounded-full bg-[var(--primary)] flex items-center justify-center text-[var(--background)]">
                        {timelineIcons[event.type] || <Clock className="w-3 h-3" />}
                      </div>
                      <div className="p-3 rounded-lg bg-[var(--background)]/50 border border-[var(--border)]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{event.title}</span>
                          <span className="text-xs text-[var(--foreground-secondary)]">
                            {new Date(event.occurredAt).toLocaleString()}
                          </span>
                        </div>
                        {event.content && (
                          <p className="text-sm text-[var(--foreground-secondary)]">{event.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--foreground-secondary)]">暂无时间线记录</p>
            )}
          </GlowCard>

          <GlowCard variant="primary" className="p-6" id="recordings-section">
            <h3 className="text-lg font-medium mb-4">录音记录</h3>
            {customer.audioRecords.length > 0 ? (
              <div className="space-y-4">
                {customer.audioRecords.map((record) => (
                  <div
                    key={record.id}
                    className="p-4 rounded-lg bg-[var(--background)]/50 border border-[var(--border)]"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <FileAudio className="w-5 h-5 text-[var(--primary)]" />
                        <div>
                          <p className="font-medium">{record.fileName}</p>
                          <p className="text-sm text-[var(--foreground-secondary)]">
                            {Math.floor(record.duration / 60)}分{record.duration % 60}秒 · {new Date(record.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          record.status === "done"
                            ? "bg-[var(--success)]/20 text-[var(--success)]"
                            : record.status === "pending"
                            ? "bg-[var(--warning)]/20 text-[var(--warning)]"
                            : "bg-[var(--danger)]/20 text-[var(--danger)]"
                        }`}
                      >
                        {record.status === "done"
                          ? "已解析"
                          : record.status === "pending"
                          ? "待解析"
                          : "解析失败"}
                      </span>
                    </div>
                    {record.status === "done" && (
                      <AudioPlayer url={record.ossUrl} />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--foreground-secondary)]">暂无录音记录</p>
            )}
          </GlowCard>
        </div>
      </div>
    </div>
  )
}
