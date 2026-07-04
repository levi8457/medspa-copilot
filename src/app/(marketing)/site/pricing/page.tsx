"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  Sparkles,
  HelpCircle,
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

const pricingPlans = [
  {
    name: "免费版",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "适合个人咨询师体验",
    popular: false,
    variant: "primary" as const,
    features: {
      "基础功能": [
        { name: "每月录音分析", value: "10 条", included: true },
        { name: "客户管理", value: "100 位", included: true },
        { name: "基础客户标签", value: true, included: true },
        { name: "话术模板", value: "5 个", included: true },
      ],
      "AI 能力": [
        { name: "智能录音分析", value: true, included: true },
        { name: "客户分层", value: false, included: false },
        { name: "话术生成", value: false, included: false },
        { name: "健康度评估", value: false, included: false },
      ],
      "数据与管理": [
        { name: "基础数据统计", value: true, included: true },
        { name: "团队管理", value: false, included: false },
        { name: "审批流程", value: false, included: false },
        { name: "API 接口", value: false, included: false },
      ],
      "支持与服务": [
        { name: "社区支持", value: true, included: true },
        { name: "优先技术支持", value: false, included: false },
        { name: "专属客户经理", value: false, included: false },
        { name: "定制化服务", value: false, included: false },
      ],
    },
    cta: "开始使用",
  },
  {
    name: "专业版",
    monthlyPrice: 299,
    yearlyPrice: 239,
    description: "适合小型医美机构",
    popular: true,
    variant: "accent" as const,
    features: {
      "基础功能": [
        { name: "每月录音分析", value: "500 条", included: true },
        { name: "客户管理", value: "无限", included: true },
        { name: "高级客户标签", value: true, included: true },
        { name: "话术模板", value: "无限", included: true },
      ],
      "AI 能力": [
        { name: "智能录音分析", value: true, included: true },
        { name: "客户分层", value: true, included: true },
        { name: "话术生成", value: true, included: true },
        { name: "健康度评估", value: true, included: true },
      ],
      "数据与管理": [
        { name: "高级数据分析", value: true, included: true },
        { name: "团队管理", value: "10 人", included: true },
        { name: "审批流程", value: false, included: false },
        { name: "API 接口", value: false, included: false },
      ],
      "支持与服务": [
        { name: "社区支持", value: true, included: true },
        { name: "优先技术支持", value: true, included: true },
        { name: "专属客户经理", value: false, included: false },
        { name: "定制化服务", value: false, included: false },
      ],
    },
    cta: "免费试用",
  },
  {
    name: "企业版",
    monthlyPrice: 999,
    yearlyPrice: 799,
    description: "适合中大型医美连锁",
    popular: false,
    variant: "success" as const,
    features: {
      "基础功能": [
        { name: "每月录音分析", value: "无限", included: true },
        { name: "客户管理", value: "无限", included: true },
        { name: "高级客户标签", value: true, included: true },
        { name: "话术模板", value: "无限", included: true },
      ],
      "AI 能力": [
        { name: "智能录音分析", value: true, included: true },
        { name: "客户分层", value: true, included: true },
        { name: "话术生成", value: true, included: true },
        { name: "健康度评估", value: true, included: true },
      ],
      "数据与管理": [
        { name: "企业级数据分析", value: true, included: true },
        { name: "团队管理", value: "无限", included: true },
        { name: "审批流程", value: true, included: true },
        { name: "API 接口", value: true, included: true },
      ],
      "支持与服务": [
        { name: "社区支持", value: true, included: true },
        { name: "优先技术支持", value: true, included: true },
        { name: "专属客户经理", value: true, included: true },
        { name: "定制化服务", value: true, included: true },
      ],
    },
    cta: "联系销售",
  },
]

const faqs = [
  {
    question: "免费试用需要信用卡吗？",
    answer: "不需要。您只需注册账号即可开始 14 天的免费试用，试用期间无需绑定任何支付方式。试用期结束后，您可以选择升级到付费版本或继续使用免费版。",
  },
  {
    question: "可以随时取消订阅吗？",
    answer: "是的，您可以随时取消订阅，没有任何额外费用。取消后，您的账户将在当前计费周期结束后降级为免费版，已有的数据不会丢失。",
  },
  {
    question: "支持哪些付款方式？",
    answer: "我们支持微信支付、支付宝、银行卡转账等多种付款方式。企业版客户还可以选择对公转账和合同签约。",
  },
  {
    question: "数据安全如何保障？",
    answer: "我们高度重视数据安全。所有数据采用加密存储，传输过程使用 SSL/TLS 加密。企业版客户还可以选择私有化部署，数据完全存储在您自己的服务器上。",
  },
  {
    question: "可以自定义 AI 模型吗？",
    answer: "企业版客户支持定制化 AI 模型训练。我们可以根据您的业务场景和话术风格，训练专属的 AI 模型，让分析结果更精准。",
  },
  {
    question: "提供哪些技术支持？",
    answer: "免费版用户享有社区支持；专业版用户享有优先技术支持，响应时间不超过 24 小时；企业版用户配备专属客户经理，提供 7x24 小时技术支持。",
  },
]

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

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
            <TagCapsule label="价格方案" variant="primary" size="lg" animated />
            <h1 className="text-4xl sm:text-5xl font-bold mt-6 mb-6 text-[var(--foreground)]">
              选择适合您的
              <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent">
                智能方案
              </span>
            </h1>
            <p className="text-lg text-[var(--foreground-secondary)] mb-10">
              从个人咨询师到大型连锁机构，我们都有适合您的方案。
              立即注册，享受 14 天免费试用。
            </p>

            {/* 月付/年付切换 */}
            <div className="inline-flex items-center gap-3 p-1 rounded-full bg-[var(--background-card)] border border-[var(--border)]">
              <button
                onClick={() => setIsYearly(false)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  !isYearly
                    ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--background)]"
                    : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
                }`}
              >
                月付
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  isYearly
                    ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--background)]"
                    : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
                }`}
              >
                年付
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isYearly ? "bg-[var(--background)]/20" : "bg-[var(--success)]/20 text-[var(--success)]"
                }`}>
                  省 20%
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 价格卡片 */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid md:grid-cols-3 gap-6 items-start"
          >
            {pricingPlans.map((plan, index) => (
              <motion.div key={index} variants={fadeInUp} className={plan.popular ? "md:-mt-4" : ""}>
                <GlowCard
                  variant={plan.variant}
                  className={`p-6 h-full relative ${plan.popular ? "ring-2 ring-[var(--accent)]/50" : ""}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <TagCapsule label="最受欢迎" variant="accent" size="sm" />
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-[var(--foreground-secondary)] mb-4">
                      {plan.description}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-[var(--foreground)]">
                        ¥{isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                      </span>
                      <span className="text-[var(--foreground-secondary)]">/月</span>
                      {isYearly && plan.yearlyPrice > 0 && (
                        <span className="ml-2 text-xs text-[var(--success)] bg-[var(--success)]/10 px-2 py-0.5 rounded-full">
                          年付省 ¥{(plan.monthlyPrice - plan.yearlyPrice) * 12}
                        </span>
                      )}
                    </div>
                  </div>

                  <a
                    href="/trial"
                    className={`block w-full text-center py-2.5 rounded-lg font-medium text-sm transition-all mb-6 ${
                      plan.popular
                        ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--background)] hover:opacity-90"
                        : "border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)]/50 hover:text-[var(--primary)]"
                    }`}
                  >
                    {plan.cta}
                  </a>

                  {/* 功能对比 */}
                  <div className="space-y-6">
                    {Object.entries(plan.features).map(([category, items]) => (
                      <div key={category}>
                        <p className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider mb-3">
                          {category}
                        </p>
                        <ul className="space-y-2">
                          {items.map((feature, i) => (
                            <li
                              key={i}
                              className="flex items-center justify-between text-sm"
                            >
                              <span
                                className={
                                  feature.included
                                    ? "text-[var(--foreground-secondary)]"
                                    : "text-[var(--foreground-muted)] line-through"
                                }
                              >
                                {feature.name}
                              </span>
                              <span className="flex items-center gap-1">
                                {typeof feature.value === "boolean" ? (
                                  feature.included ? (
                                    <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-[var(--foreground-muted)]" />
                                  )
                                ) : (
                                  <span
                                    className={
                                      feature.included
                                        ? "text-[var(--foreground)] font-medium"
                                        : "text-[var(--foreground-muted)]"
                                    }
                                  >
                                    {feature.value}
                                  </span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </GlowCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ 部分 */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--accent)]/5 to-transparent" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center mb-16"
          >
            <TagCapsule label="常见问题" variant="accent" size="md" />
            <h2 className="text-3xl sm:text-4xl font-bold mt-4 mb-4 text-[var(--foreground)]">
              您可能想知道的
            </h2>
            <p className="text-[var(--foreground-secondary)]">
              还有其他问题？随时联系我们的客服团队。
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-3"
          >
            {faqs.map((faq, index) => (
              <GlowCard key={index} variant="primary" className="overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-[var(--primary)] shrink-0" />
                    <span className="font-medium text-[var(--foreground)]">
                      {faq.question}
                    </span>
                  </div>
                  <motion.div
                    animate={{ rotate: openFaq === index ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0 text-[var(--foreground-secondary)]"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pl-14 text-sm text-[var(--foreground-secondary)] leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlowCard>
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
                  还在犹豫？立即免费试用
                </h2>
                <p className="text-[var(--foreground-secondary)] max-w-xl mx-auto mb-8">
                  14 天免费试用，无需信用卡，体验所有专业版功能。
                  不满意随时取消，没有任何风险。
                </p>
                <a
                  href="/trial"
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--background)] font-medium hover:opacity-90 transition-opacity"
                >
                  <Zap className="w-4 h-4" />
                  立即开始免费试用
                </a>
              </div>
            </GlowCard>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
