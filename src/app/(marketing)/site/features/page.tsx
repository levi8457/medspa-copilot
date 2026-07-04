"use client"

import { motion } from "framer-motion"
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Mic,
  Brain,
  MessageSquare,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Sparkles,
  CheckCircle2,
  Zap,
} from "lucide-react"
import { GlowCard } from "@/components/futuristic/GlowCard"
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

const featureModules = [
  {
    title: "咨询师工作台",
    icon: <LayoutDashboard className="w-8 h-8" />,
    variant: "primary" as const,
    description: "一站式工作平台，让咨询师高效管理客户和日常工作",
    features: [
      {
        icon: <Users className="w-5 h-5" />,
        title: "客户管理",
        desc: "完整的客户档案管理，支持多维度标签分类，快速检索和筛选客户信息。",
      },
      {
        icon: <Calendar className="w-5 h-5" />,
        title: "日程管理",
        desc: "智能日程安排，自动提醒跟进事项，让工作有条不紊。",
      },
      {
        icon: <FileText className="w-5 h-5" />,
        title: "跟进记录",
        desc: "完整的跟进历史记录，支持文字、语音、图片等多种记录方式。",
      },
    ],
  },
  {
    title: "机构管理",
    icon: <BarChart3 className="w-8 h-8" />,
    variant: "accent" as const,
    description: "全方位机构运营管理，数据驱动决策",
    features: [
      {
        icon: <TrendingUp className="w-5 h-5" />,
        title: "业绩统计",
        desc: "实时业绩数据看板，多维度数据分析，洞察业务增长机会。",
      },
      {
        icon: <PieChart className="w-5 h-5" />,
        title: "团队管理",
        desc: "咨询师团队绩效管理，工作量、转化率等核心指标一目了然。",
      },
      {
        icon: <Activity className="w-5 h-5" />,
        title: "合规审批",
        desc: "灵活的审批流程配置，多级审核机制，确保合规运营。",
      },
    ],
  },
  {
    title: "AI 能力",
    icon: <Brain className="w-8 h-8" />,
    variant: "success" as const,
    description: "强大的 AI 引擎，为医美运营赋能",
    features: [
      {
        icon: <Mic className="w-5 h-5" />,
        title: "智能录音分析",
        desc: "AI 自动转写和分析咨询对话，提取关键信息、客户需求和痛点。",
      },
      {
        icon: <MessageSquare className="w-5 h-5" />,
        title: "话术生成",
        desc: "基于客户画像和场景，智能生成个性化跟进话术，提升沟通效果。",
      },
      {
        icon: <Target className="w-5 h-5" />,
        title: "客户分层",
        desc: "AI 模型自动对客户进行分层分级，精准识别高价值客户。",
      },
    ],
  },
  {
    title: "数据洞察",
    icon: <PieChart className="w-8 h-8" />,
    variant: "warning" as const,
    description: "深度数据分析，发现业务增长机会",
    features: [
      {
        icon: <Activity className="w-5 h-5" />,
        title: "健康度评估",
        desc: "多维度客户健康度评估，实时监控客户状态，预警流失风险。",
      },
      {
        icon: <TrendingUp className="w-5 h-5" />,
        title: "转化漏斗",
        desc: "完整的客户转化漏斗分析，识别转化瓶颈，优化转化路径。",
      },
      {
        icon: <Zap className="w-5 h-5" />,
        title: "智能推荐",
        desc: "基于数据分析的智能推荐，为每个客户提供最优跟进策略。",
      },
    ],
  },
]

export default function FeaturesPage() {
  return (
    <div className="flex flex-col">
      {/* 顶部标题区 */}
      <section className="relative py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <TagCapsule label="功能详解" variant="primary" size="lg" animated />
            <h1 className="text-4xl sm:text-5xl font-bold mt-6 mb-6 text-[var(--foreground)]">
              强大功能，助力
              <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent">
                医美智能运营
              </span>
            </h1>
            <p className="text-lg text-[var(--foreground-secondary)]">
              MedSpa AI 提供全方位的医美机构智能化解决方案，
              从咨询师工作台到机构管理，从 AI 分析到数据洞察，
              全面提升运营效率和业绩。
            </p>
          </motion.div>
        </div>
      </section>

      {/* 功能模块 */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
          {featureModules.map((module, moduleIndex) => (
            <motion.div
              key={moduleIndex}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5 }}
            >
              {/* 模块标题 */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--accent)]/20 border border-[var(--primary)]/30 flex items-center justify-center text-[var(--primary)]">
                  {module.icon}
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
                    {module.title}
                  </h2>
                  <p className="text-[var(--foreground-secondary)] mt-1">
                    {module.description}
                  </p>
                </div>
              </div>

              {/* 功能卡片 */}
              <motion.div
                variants={staggerContainer}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {module.features.map((feature, featureIndex) => (
                  <motion.div key={featureIndex} variants={fadeInUp}>
                    <GlowCard variant={module.variant} className="p-6 h-full">
                      <div className="w-10 h-10 rounded-lg bg-[var(--background)]/50 border border-[var(--border)] flex items-center justify-center text-[var(--primary)] mb-4">
                        {feature.icon}
                      </div>
                      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-[var(--foreground-secondary)] leading-relaxed">
                        {feature.desc}
                      </p>
                    </GlowCard>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 更多特性 */}
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
            <TagCapsule label="更多特性" variant="accent" size="md" />
            <h2 className="text-3xl sm:text-4xl font-bold mt-4 mb-4 text-[var(--foreground)]">
              细节之处，尽显专业
            </h2>
            <p className="text-[var(--foreground-secondary)]">
              每一个功能细节，都经过精心设计，只为给您最好的使用体验。
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {[
              "实时数据同步",
              "多端数据互通",
              "数据加密存储",
              "7x24 技术支持",
              "定期功能更新",
              "私有化部署支持",
              "多机构管理",
              "自定义工作流",
            ].map((item, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <GlowCard variant="primary" className="p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--success)] shrink-0" />
                  <span className="text-sm text-[var(--foreground)]">{item}</span>
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
                <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] mb-4">
                  体验完整功能，开启智能运营
                </h2>
                <p className="text-[var(--foreground-secondary)] max-w-xl mx-auto mb-8">
                  立即注册 14 天免费试用，体验所有专业版功能，
                  无需信用卡，随时可取消。
                </p>
                <a
                  href="/trial"
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--background)] font-medium hover:opacity-90 transition-opacity"
                >
                  免费开始使用
                  <Sparkles className="w-4 h-4" />
                </a>
              </div>
            </GlowCard>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
