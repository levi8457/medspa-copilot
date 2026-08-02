"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Mic,
  Users,
  MessageSquare,
  Megaphone,
  Heart,
  ShieldCheck,
  ArrowRight,
  Upload,
  Brain,
  Zap,
  TrendingUp,
  Star,
  Quote,
  CheckCircle2,
  Sparkles,
  Check,
} from "lucide-react"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { HudPanel } from "@/components/futuristic/HudPanel"
import { EnergyRing } from "@/components/futuristic/EnergyRing"
import { TagCapsule } from "@/components/futuristic/TagCapsule"

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const features = [
  {
    icon: <Mic className="w-6 h-6" />,
    title: "AI 录音分析",
    description: "智能识别咨询对话内容，自动提取关键信息、客户需求和痛点，生成结构化分析报告。",
    variant: "primary" as const,
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "智能客户分层",
    description: "基于 AI 模型自动对客户进行分层分级，精准识别高价值客户，优化资源分配。",
    variant: "accent" as const,
  },
  {
    icon: <MessageSquare className="w-6 h-6" />,
    title: "自动生成话术",
    description: "根据客户画像和沟通场景，智能生成个性化跟进话术，提升沟通效率和转化率。",
    variant: "success" as const,
  },
  {
    icon: <Megaphone className="w-6 h-6" />,
    title: "营销活动",
    description: "AI 驱动的营销活动策划，精准触达目标客户群体，提升活动效果和 ROI。",
    variant: "warning" as const,
  },
  {
    icon: <Heart className="w-6 h-6" />,
    title: "健康度评估",
    description: "多维度客户健康度评估体系，实时监控客户状态，预警流失风险，提升留存率。",
    variant: "danger" as const,
  },
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    title: "审批协同",
    description: "灵活的审批流程配置，多级审核机制，确保合规运营，降低经营风险。",
    variant: "primary" as const,
  },
]

const stats = [
  { label: "合作机构", value: 500, unit: "+", variant: "primary" as const },
  { label: "服务客户", value: 100000, unit: "+", variant: "accent" as const },
  { label: "AI 生成话术", value: 500000, unit: "+", variant: "success" as const },
  { label: "平均转化率提升", value: 35, unit: "%", variant: "warning" as const },
]

const workflow = [
  { step: 1, icon: <Upload className="w-8 h-8" />, title: "上传录音", desc: "上传咨询录音或实时录音转写" },
  { step: 2, icon: <Brain className="w-8 h-8" />, title: "AI 分析", desc: "AI 智能解析对话内容，提取关键信息" },
  { step: 3, icon: <Zap className="w-8 h-8" />, title: "生成策略", desc: "基于分析结果生成个性化跟进策略" },
  { step: 4, icon: <TrendingUp className="w-8 h-8" />, title: "跟进转化", desc: "执行跟进计划，提升客户转化率" },
]

const pricingPlans = [
  {
    name: "免费版",
    price: { monthly: 0, yearly: 0 },
    description: "适合个人咨询师体验",
    features: ["每月 10 条录音分析", "基础客户标签", "5 个话术模板", "社区支持"],
    cta: "开始使用",
    popular: false,
    variant: "primary" as const,
    ctaHref: "/trial",
  },
  {
    name: "专业版",
    price: { monthly: 299, yearly: 239 },
    description: "适合小型医美机构",
    features: [
      "每月 500 条录音分析",
      "完整客户分层体系",
      "无限话术生成",
      "营销活动支持",
      "健康度评估",
      "优先技术支持",
    ],
    cta: "免费试用",
    popular: true,
    variant: "accent" as const,
    ctaHref: "/trial",
  },
  {
    name: "企业版",
    price: { monthly: 999, yearly: 799 },
    description: "适合中大型医美连锁",
    features: [
      "无限录音分析",
      "多机构管理",
      "定制化 AI 模型",
      "审批协同工作流",
      "API 接口调用",
      "专属客户经理",
      "数据私有化部署",
    ],
    cta: "联系销售",
    popular: false,
    variant: "success" as const,
    ctaHref: "/trial",
  },
]

const testimonials = [
  {
    name: "李医生",
    role: "院长",
    org: "悦美医疗美容",
    content:
      "使用 MedSpa AI 后，我们的客户转化率提升了 40%。AI 生成的话术非常专业，咨询师的跟进效率大大提高。",
    avatar: "L",
    variant: "primary" as const,
  },
  {
    name: "张经理",
    role: "运营总监",
    org: "华美整形医院",
    content:
      "录音分析功能太棒了！以前需要人工听录音做质检，现在 AI 自动分析，还能发现问题话术，帮助团队快速成长。",
    avatar: "Z",
    variant: "accent" as const,
  },
  {
    name: "王咨询师",
    role: "资深咨询师",
    org: "俪人医美",
    content:
      "客户分层和健康度评估让我能精准把握重点客户，跟进更有针对性，业绩提升明显，强烈推荐！",
    avatar: "W",
    variant: "success" as const,
  },
]

export default function HomePage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [displayPrices, setDisplayPrices] = useState<Record<string, number>>({})

  useEffect(() => {
    const targets: Record<string, number> = {}
    pricingPlans.forEach((plan) => {
      targets[plan.name] = billingCycle === "yearly" ? plan.price.yearly : plan.price.monthly
    })

    const startPrices = { ...displayPrices }
    const duration = 400
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)

      const next: Record<string, number> = {}
      pricingPlans.forEach((plan) => {
        const start = startPrices[plan.name] ?? targets[plan.name]
        next[plan.name] = Math.round(start + (targets[plan.name] - start) * easeOut)
      })

      setDisplayPrices(next)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [billingCycle])

  useEffect(() => {
    const initial: Record<string, number> = {}
    pricingPlans.forEach((plan) => {
      initial[plan.name] = plan.price.monthly
    })
    setDisplayPrices(initial)
  }, [])
  return (
    <div className="flex flex-col">
      {/* Hero 区 */}
      <section className="relative py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div {...fadeInUp} className="space-y-8">
              <div>
                <TagCapsule label="AI 驱动的医美增长引擎" variant="primary" size="lg" animated />
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-[var(--foreground)]">医美机构的</span>
                <br />
                <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent">
                  AI 智能管家
                </span>
              </h1>
              <p className="text-lg text-[var(--foreground-secondary)] max-w-lg">
                从录音解析到智能跟进，MedSpa AI 为医美机构提供全流程 AI 赋能，
                助力咨询师高效运营，显著提升客户转化率和业绩增长。
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/trial"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--background)] font-medium hover:opacity-90 transition-opacity"
                >
                  免费试用 14 天
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/site/features"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[var(--border)] text-[var(--foreground)] font-medium hover:border-[var(--primary)]/50 hover:text-[var(--primary)] transition-colors"
                >
                  了解功能
                  <Sparkles className="w-4 h-4" />
                </Link>
              </div>
              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-2">
                  {["bg-[var(--primary)]", "bg-[var(--accent)]", "bg-[var(--success)]"].map(
                    (color, i) => (
                      <div
                        key={i}
                        className={`w-8 h-8 rounded-full ${color} border-2 border-[var(--background)] flex items-center justify-center text-xs font-bold text-[var(--background)]`}
                      >
                        {String.fromCharCode(65 + i)}
                      </div>
                    )
                  )}
                </div>
                <div className="text-sm">
                  <div className="flex items-center gap-1 text-[var(--warning)]">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-[var(--foreground-secondary)]">
                    500+ 医美机构信赖之选
                  </p>
                </div>
              </div>
            </motion.div>

            {/* 产品预览 */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
              className="relative"
            >
              <div className="relative">
                {/* 主卡片 */}
                <GlowCard variant="primary" className="p-6 relative z-10">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-[var(--foreground)]">AI 智能分析</h3>
                      <TagCapsule label="实时" variant="success" size="sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <HudPanel label="今日录音" value={28} unit="条" variant="primary" />
                      <HudPanel label="转化率" value={32.5} unit="%" trend="up" trendValue="+5.2%" variant="success" />
                    </div>
                    <div className="flex items-center gap-4 py-4">
                      <EnergyRing value={78} size={80} variant="primary" label="健康度" />
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--foreground-secondary)]">客户满意度</span>
                          <span className="text-[var(--success)]">92%</span>
                        </div>
                        <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "92%" }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--success)] rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-[var(--foreground-secondary)]">推荐话术</p>
                      <div className="p-3 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] text-sm text-[var(--foreground)]">
                        根据客户关注的抗衰需求，建议重点介绍热玛吉的长效效果...
                      </div>
                    </div>
                  </div>
                </GlowCard>

                {/* 装饰卡片 1 */}
                <motion.div
                  initial={{ opacity: 0, x: -20, y: 20 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="absolute -left-4 -bottom-4 w-48"
                >
                  <GlowCard variant="accent" className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)]">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-[var(--foreground-secondary)]">高价值客户</p>
                        <p className="font-bold text-[var(--foreground)]">128 位</p>
                      </div>
                    </div>
                  </GlowCard>
                </motion.div>

                {/* 装饰卡片 2 */}
                <motion.div
                  initial={{ opacity: 0, x: 20, y: -20 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className="absolute -right-4 -top-4 w-44"
                >
                  <GlowCard variant="success" className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--success)]/20 flex items-center justify-center text-[var(--success)]">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-[var(--foreground-secondary)]">转化率提升</p>
                        <p className="font-bold text-[var(--success)]">+35%</p>
                      </div>
                    </div>
                  </GlowCard>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 核心能力 */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <TagCapsule label="核心能力" variant="accent" size="md" />
            <h2 className="text-3xl sm:text-4xl font-bold mt-4 mb-4 text-[var(--foreground)]">
              六大 AI 能力，全面赋能医美运营
            </h2>
            <p className="text-[var(--foreground-secondary)]">
              从录音分析到客户跟进，MedSpa AI 提供全方位的 AI 智能解决方案，
              帮助医美机构降本增效，提升业绩。
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <GlowCard variant={feature.variant} className="p-6 h-full">
                  <div className="w-12 h-12 rounded-xl bg-[var(--background)]/50 border border-[var(--border)] flex items-center justify-center text-[var(--primary)] mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[var(--foreground-secondary)]">
                    {feature.description}
                  </p>
                </GlowCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 数据亮点 */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/5 via-transparent to-[var(--accent)]/5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <TagCapsule label="数据驱动" variant="success" size="md" />
            <h2 className="text-3xl sm:text-4xl font-bold mt-4 mb-4 text-[var(--foreground)]">
              用数据说话，见证 AI 的力量
            </h2>
            <p className="text-[var(--foreground-secondary)]">
              已有 500+ 医美机构选择 MedSpa AI，共同见证业绩增长。
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {stats.map((stat, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <HudPanel
                  label={stat.label}
                  value={stat.value}
                  unit={stat.unit}
                  variant={stat.variant}
                  className="text-center py-6"
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 工作流程 */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <TagCapsule label="工作流程" variant="warning" size="md" />
            <h2 className="text-3xl sm:text-4xl font-bold mt-4 mb-4 text-[var(--foreground)]">
              四步开启智能运营之旅
            </h2>
            <p className="text-[var(--foreground-secondary)]">
              简单易用的操作流程，让 AI 快速融入您的日常工作。
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {workflow.map((item, index) => (
              <motion.div key={index} variants={fadeInUp} className="relative">
                <GlowCard variant="primary" className="p-6 text-center">
                  <div className="relative inline-block mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--accent)]/20 border border-[var(--primary)]/30 flex items-center justify-center text-[var(--primary)] mx-auto">
                      {item.icon}
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--background)] text-sm font-bold flex items-center justify-center">
                      {item.step}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[var(--foreground-secondary)]">
                    {item.desc}
                  </p>
                </GlowCard>
                {index < workflow.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 text-[var(--primary)]/30">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 价格方案 */}
      <section className="py-20 relative" id="pricing">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--accent)]/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-3xl mx-auto mb-12"
          >
            <TagCapsule label="价格方案" variant="primary" size="md" />
            <h2 className="text-3xl sm:text-4xl font-bold mt-4 mb-4 text-[var(--foreground)]">
              灵活定价，总有一款适合您
            </h2>
            <p className="text-[var(--foreground-secondary)]">
              从个人咨询师到大型连锁机构，我们提供多种方案满足不同规模需求。
            </p>
          </motion.div>

          {/* 计费周期切换器 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex justify-center mb-12"
          >
            <div className="inline-flex items-center p-1 rounded-xl bg-[var(--background-card)]/80 border border-[var(--border)] backdrop-blur-sm">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`relative px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  billingCycle === "monthly"
                    ? "text-[var(--background)]"
                    : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
                }`}
              >
                {billingCycle === "monthly" && (
                  <motion.div
                    layoutId="billing-active-bg"
                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10">按月付费</span>
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`relative px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  billingCycle === "yearly"
                    ? "text-[var(--background)]"
                    : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
                }`}
              >
                {billingCycle === "yearly" && (
                  <motion.div
                    layoutId="billing-active-bg"
                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10">按年付费</span>
                <span className="relative z-10 text-[10px] px-1.5 py-0.5 rounded bg-[var(--success)]/20 text-[var(--success)] font-semibold">
                  省20%
                </span>
              </button>
            </div>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-6 items-start"
          >
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                variants={fadeInUp}
                className={`${plan.popular ? "md:-mt-4" : ""} cursor-pointer`}
                onClick={() => setSelectedPlan(selectedPlan === plan.name ? null : plan.name)}
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <GlowCard
                  variant={plan.variant}
                  className={`p-6 h-full relative transition-all duration-300 ${
                    selectedPlan === plan.name
                      ? "ring-2 ring-[var(--primary)] scale-[1.02]"
                      : plan.popular
                        ? "ring-2 ring-[var(--accent)]/50"
                        : ""
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <TagCapsule label="最受欢迎" variant="accent" size="sm" />
                    </div>
                  )}
                  {selectedPlan === plan.name && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[var(--primary)] flex items-center justify-center text-[var(--background)] shadow-lg shadow-[var(--primary)]/30"
                    >
                      <Check className="w-4 h-4" />
                    </motion.div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-[var(--foreground-secondary)] mb-4">
                      {plan.description}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm text-[var(--foreground-secondary)]">¥</span>
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={billingCycle + plan.name}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }}
                          className="text-4xl font-bold text-[var(--foreground)] font-mono tabular-nums"
                        >
                          {displayPrices[plan.name] ?? 0}
                        </motion.span>
                      </AnimatePresence>
                      <span className="text-[var(--foreground-secondary)]">
                        /{billingCycle === "monthly" ? "月" : "月（年付）"}
                      </span>
                    </div>
                    {billingCycle === "yearly" && plan.price.yearly > 0 && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="text-xs text-[var(--success)] mt-2"
                      >
                        年付立省 ¥{(plan.price.monthly - plan.price.yearly) * 12}
                      </motion.p>
                    )}
                  </div>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-[var(--success)] shrink-0 mt-0.5" />
                        <span className="text-[var(--foreground-secondary)]">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.ctaHref}
                    onClick={(e) => e.stopPropagation()}
                    className={`block w-full text-center py-2.5 rounded-lg font-medium text-sm transition-all ${
                      plan.popular || selectedPlan === plan.name
                        ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--background)] hover:opacity-90 shadow-lg shadow-[var(--primary)]/20"
                        : "border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)]/50 hover:text-[var(--primary)]"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </GlowCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 客户证言 */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <TagCapsule label="客户评价" variant="accent" size="md" />
            <h2 className="text-3xl sm:text-4xl font-bold mt-4 mb-4 text-[var(--foreground)]">
              听听他们怎么说
            </h2>
            <p className="text-[var(--foreground-secondary)]">
              来自医美行业从业者的真实反馈。
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-6"
          >
            {testimonials.map((item, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <GlowCard variant={item.variant} className="p-6 h-full">
                  <Quote className="w-8 h-8 text-[var(--primary)]/30 mb-4" />
                  <p className="text-[var(--foreground-secondary)] mb-6 text-sm leading-relaxed">
                    "{item.content}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-[var(--background)] font-bold">
                      {item.avatar}
                    </div>
                    <div>
                      <p className="font-medium text-[var(--foreground)] text-sm">{item.name}</p>
                      <p className="text-xs text-[var(--foreground-secondary)]">
                        {item.role} · {item.org}
                      </p>
                    </div>
                  </div>
                </GlowCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA 区 */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <GlowCard variant="primary" className="p-8 sm:p-12 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/10 via-transparent to-[var(--accent)]/10" />
              <div className="relative">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--foreground)] mb-4">
                  立即开启 14 天免费试用
                </h2>
                <p className="text-[var(--foreground-secondary)] max-w-xl mx-auto mb-8">
                  无需信用卡，注册即可体验所有专业版功能。
                  让 AI 为您的医美事业赋能，从今天开始。
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link
                    href="/trial"
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--background)] font-medium hover:opacity-90 transition-opacity"
                  >
                    免费开始使用
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/site/pricing"
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-lg border border-[var(--border)] text-[var(--foreground)] font-medium hover:border-[var(--primary)]/50 hover:text-[var(--primary)] transition-colors"
                  >
                    查看价格方案
                  </Link>
                </div>
              </div>
            </GlowCard>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
