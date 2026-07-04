"use client"

import { motion } from "framer-motion"
import {
  Sparkles,
  Target,
  Heart,
  Lightbulb,
  Mail,
  Phone,
  MapPin,
  Users,
  Award,
  ShieldCheck,
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

const values = [
  {
    icon: <Target className="w-8 h-8" />,
    title: "使命",
    description: "用 AI 赋能医美行业，让每一位咨询师都能更高效地服务客户，让每一位客户都能获得更专业的咨询体验。",
    variant: "primary" as const,
  },
  {
    icon: <Heart className="w-8 h-8" />,
    title: "愿景",
    description: "成为医美行业最值得信赖的 AI 合作伙伴，推动行业数字化转型，引领智能医美新时代。",
    variant: "accent" as const,
  },
  {
    icon: <Lightbulb className="w-8 h-8" />,
    title: "价值观",
    description: "客户至上、创新驱动、诚信正直、开放协作。我们坚信技术的价值在于服务于人。",
    variant: "success" as const,
  },
]

const teamHighlights = [
  {
    icon: <Users className="w-6 h-6" />,
    label: "核心团队",
    value: "50+",
    desc: "来自一线互联网公司的技术和产品专家",
  },
  {
    icon: <Award className="w-6 h-6" />,
    label: "行业经验",
    value: "10年+",
    desc: "深耕医美行业，深刻理解行业痛点",
  },
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    label: "技术专利",
    value: "20+",
    desc: "AI 算法和产品技术专利",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    label: "服务客户",
    value: "500+",
    desc: "医美机构的共同选择",
  },
]

export default function AboutPage() {
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
            <TagCapsule label="关于我们" variant="primary" size="lg" animated />
            <h1 className="text-4xl sm:text-5xl font-bold mt-6 mb-6 text-[var(--foreground)]">
              用 AI 重新定义
              <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent">
                医美运营
              </span>
            </h1>
            <p className="text-lg text-[var(--foreground-secondary)]">
              MedSpa AI 是一家专注于医美行业的人工智能科技公司。
              我们致力于用最前沿的 AI 技术，为医美机构提供智能化解决方案，
              助力行业数字化升级。
            </p>
          </motion.div>
        </div>
      </section>

      {/* 公司介绍 */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <TagCapsule label="公司介绍" variant="accent" size="md" />
              <h2 className="text-3xl sm:text-4xl font-bold mt-4 mb-6 text-[var(--foreground)]">
                我们是谁
              </h2>
              <div className="space-y-4 text-[var(--foreground-secondary)] leading-relaxed">
                <p>
                  MedSpa AI 成立于 2023 年，是一家专注于医美行业的人工智能科技公司。
                  我们的核心团队来自腾讯、阿里、字节跳动等一线互联网公司，
                  拥有丰富的 AI 技术研发和产品经验。
                </p>
                <p>
                  我们深耕医美行业多年，深刻理解医美机构的运营痛点和咨询师的工作需求。
                  通过将先进的 AI 技术与医美行业的深度洞察相结合，
                  我们打造了 MedSpa AI 智能管家——一款专为医美机构量身定制的 AI 运营助手。
                </p>
                <p>
                  从录音智能分析到客户分层管理，从话术自动生成到营销活动策划，
                  MedSpa AI 贯穿医美咨询的全流程，帮助机构降本增效，
                  显著提升客户转化率和业绩增长。
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <GlowCard variant="primary" className="p-8">
                <div className="grid grid-cols-2 gap-4">
                  {teamHighlights.map((item, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-xl bg-[var(--background)]/50 border border-[var(--border)]"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] mb-3">
                        {item.icon}
                      </div>
                      <p className="text-2xl font-bold text-[var(--foreground)] mb-1">
                        {item.value}
                      </p>
                      <p className="text-sm font-medium text-[var(--foreground-secondary)] mb-1">
                        {item.label}
                      </p>
                      <p className="text-xs text-[var(--foreground-muted)]">
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </GlowCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 使命愿景价值观 */}
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
            <TagCapsule label="企业文化" variant="success" size="md" />
            <h2 className="text-3xl sm:text-4xl font-bold mt-4 mb-4 text-[var(--foreground)]">
              使命、愿景、价值观
            </h2>
            <p className="text-[var(--foreground-secondary)]">
              这些是我们前行的动力，也是我们对每一位客户的承诺。
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-6"
          >
            {values.map((value, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <GlowCard variant={value.variant} className="p-8 h-full">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--accent)]/20 border border-[var(--primary)]/30 flex items-center justify-center text-[var(--primary)] mb-6">
                    {value.icon}
                  </div>
                  <h3 className="text-xl font-bold text-[var(--foreground)] mb-3">
                    {value.title}
                  </h3>
                  <p className="text-[var(--foreground-secondary)] leading-relaxed">
                    {value.description}
                  </p>
                </GlowCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 发展历程 */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <TagCapsule label="发展历程" variant="warning" size="md" />
            <h2 className="text-3xl sm:text-4xl font-bold mt-4 mb-4 text-[var(--foreground)]">
              我们的成长足迹
            </h2>
            <p className="text-[var(--foreground-secondary)]">
              每一步都脚踏实地，每一天都在进步。
            </p>
          </motion.div>

          <div className="relative">
            {/* 时间线 */}
            <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--primary)] via-[var(--accent)] to-[var(--success)]" />

            <div className="space-y-12">
              {[
                {
                  year: "2023 Q1",
                  title: "公司成立",
                  desc: "MedSpa AI 在上海成立，怀揣着用 AI 赋能医美行业的梦想启程。",
                  variant: "primary" as const,
                },
                {
                  year: "2023 Q3",
                  title: "产品上线",
                  desc: "MedSpa AI 1.0 版本正式发布，首批 50 家医美机构开启内测。",
                  variant: "accent" as const,
                },
                {
                  year: "2024 Q2",
                  title: "快速增长",
                  desc: "服务客户突破 200 家，获得行业广泛认可和好评。",
                  variant: "success" as const,
                },
                {
                  year: "2025 Q1",
                  title: "功能升级",
                  desc: "2.0 版本重磅发布，新增营销活动、审批协同等企业级功能。",
                  variant: "warning" as const,
                },
                {
                  year: "2026 至今",
                  title: "持续创新",
                  desc: "服务 500+ 医美机构，持续探索 AI 在医美行业的更多可能。",
                  variant: "primary" as const,
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className={`relative flex items-start gap-4 sm:gap-8 ${
                    index % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"
                  }`}
                >
                  {/* 时间点 */}
                  <div className="absolute left-4 sm:left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[var(--primary)] border-4 border-[var(--background)] z-10" />

                  {/* 内容卡片 */}
                  <div
                    className={`flex-1 ml-10 sm:ml-0 ${
                      index % 2 === 0 ? "sm:pr-12 sm:text-right" : "sm:pl-12"
                    }`}
                  >
                    <GlowCard variant={item.variant} className="p-6">
                      <TagCapsule label={item.year} variant={item.variant} size="sm" />
                      <h3 className="text-lg font-bold text-[var(--foreground)] mt-3 mb-2">
                        {item.title}
                      </h3>
                      <p className="text-sm text-[var(--foreground-secondary)]">
                        {item.desc}
                      </p>
                    </GlowCard>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 联系我们 */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--accent)]/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <TagCapsule label="联系我们" variant="primary" size="md" />
            <h2 className="text-3xl sm:text-4xl font-bold mt-4 mb-4 text-[var(--foreground)]">
              随时与我们取得联系
            </h2>
            <p className="text-[var(--foreground-secondary)]">
              无论是产品咨询、合作洽谈还是技术支持，我们都随时恭候。
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto"
          >
            <motion.div variants={fadeInUp}>
              <GlowCard variant="primary" className="p-6 text-center h-full">
                <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] mx-auto mb-4">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-[var(--foreground)] mb-2">邮箱</h3>
                <p className="text-sm text-[var(--foreground-secondary)]">
                  contact@medspa-ai.com
                </p>
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  工作日 24 小时内回复
                </p>
              </GlowCard>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <GlowCard variant="accent" className="p-6 text-center h-full">
                <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] mx-auto mb-4">
                  <Phone className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-[var(--foreground)] mb-2">电话</h3>
                <p className="text-sm text-[var(--foreground-secondary)]">
                  18996270323
                </p>
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  周一至周五 9:00-18:00
                </p>
              </GlowCard>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <GlowCard variant="success" className="p-6 text-center h-full">
                <div className="w-12 h-12 rounded-xl bg-[var(--success)]/10 flex items-center justify-center text-[var(--success)] mx-auto mb-4">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-[var(--foreground)] mb-2">地址</h3>
                <p className="text-sm text-[var(--foreground-secondary)]">
                  上海市浦东新区
                </p>
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  张江高科技园区
                </p>
              </GlowCard>
            </motion.div>
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
                  准备好开始了吗？
                </h2>
                <p className="text-[var(--foreground-secondary)] max-w-xl mx-auto mb-8">
                  立即注册 14 天免费试用，体验 MedSpa AI 带来的智能运营新方式。
                  让我们一起，用 AI 重新定义医美运营。
                </p>
                <a
                  href="/trial"
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--background)] font-medium hover:opacity-90 transition-opacity"
                >
                  <Sparkles className="w-4 h-4" />
                  免费开始使用
                </a>
              </div>
            </GlowCard>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
