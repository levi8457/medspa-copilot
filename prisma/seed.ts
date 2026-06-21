import { PrismaClient, UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("开始初始化数据库...")

  // 创建测试机构
  const org = await prisma.organization.upsert({
    where: { slug: "test-clinic" },
    update: {},
    create: {
      name: "测试医美诊所",
      slug: "test-clinic",
      isActive: true,
    },
  })
  console.log("✓ 创建机构:", org.name)

  // 创建超级管理员
  const superAdmin = await prisma.user.upsert({
    where: { email: "super@test.com" },
    update: {},
    create: {
      orgId: org.id,
      email: "super@test.com",
      name: "超级管理员",
      phone: "13800000000",
      password: await bcrypt.hash("123456", 10),
      role: UserRole.super_admin,
    },
  })
  console.log("✓ 创建超级管理员:", superAdmin.phone)

  // 创建机构管理员
  const orgAdmin = await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: {},
    create: {
      orgId: org.id,
      email: "admin@test.com",
      name: "机构管理员",
      phone: "13800000002",
      password: await bcrypt.hash("123456", 10),
      role: UserRole.org_admin,
    },
  })
  console.log("✓ 创建机构管理员:", orgAdmin.phone)

  // 创建咨询师
  const consultant = await prisma.user.upsert({
    where: { email: "consultant@test.com" },
    update: {},
    create: {
      orgId: org.id,
      email: "consultant@test.com",
      name: "张咨询师",
      phone: "13800000001",
      password: await bcrypt.hash("123456", 10),
      role: UserRole.consultant,
    },
  })
  console.log("✓ 创建咨询师:", consultant.email)

  // 创建标签体系配置
  const tagDimensions = [
    { dimension: "消费能力", values: ["高预算", "中等预算", "价格敏感"] },
    { dimension: "需求意向", values: ["高意向", "中等意向", "低意向", "对比中"] },
    { dimension: "关注项目", values: ["热玛吉", "水光针", "双眼皮", "隆鼻", "玻尿酸", "肉毒素"] },
    { dimension: "顾虑点", values: ["怕痛", "怕恢复期", "价格顾虑", "效果疑虑", "安全性"] },
    { dimension: "决策风格", values: ["果断型", "犹豫型", "研究型"] },
  ]

  for (let i = 0; i < tagDimensions.length; i++) {
    const tag = tagDimensions[i]
    await prisma.tagSchema.upsert({
      where: {
        orgId_dimension: {
          orgId: org.id,
          dimension: tag.dimension,
        },
      },
      update: {
        values: JSON.stringify(tag.values),
      },
      create: {
        orgId: org.id,
        dimension: tag.dimension,
        values: JSON.stringify(tag.values),
        sortOrder: i,
      },
    })
  }
  console.log("✓ 创建标签体系配置")

  // 创建测试客户
  const customer = await prisma.customer.upsert({
    where: { id: "test-customer-1" },
    update: {},
    create: {
      id: "test-customer-1",
      orgId: org.id,
      consultantId: consultant.id,
      name: "李女士",
      phone: "13800138000",
      wechat: "test_wechat",
      age: 28,
      gender: "女",
      source: "小红书",
      status: "negotiating",
      notes: "对热玛吉感兴趣，预算充足",
    },
  })
  console.log("✓ 创建测试客户:", customer.name)

  // 创建跟进计划
  const plan = await prisma.followUpPlan.upsert({
    where: { id: "test-plan-1" },
    update: {},
    create: {
      id: "test-plan-1",
      orgId: org.id,
      customerId: customer.id,
      title: "热玛吉项目跟进",
      description: "针对李女士的热玛吉项目跟进计划",
      strategy: JSON.stringify({
        stages: [
          { day: 1, goal: "发送项目介绍", priority: 3 },
          { day: 3, goal: "电话回访", priority: 2 },
          { day: 7, goal: "邀约到店", priority: 1 },
        ],
      }),
    },
  })
  console.log("✓ 创建跟进计划:", plan.title)

  // 创建今日跟进任务
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  await prisma.followUpTask.upsert({
    where: { id: "test-task-1" },
    update: {},
    create: {
      id: "test-task-1",
      orgId: org.id,
      planId: plan.id,
      customerId: customer.id,
      consultantId: consultant.id,
      scheduledDate: today,
      priority: 3,
      goal: "发送热玛吉项目介绍",
      script: `李女士您好！感谢您对我们热玛吉项目的关注。

热玛吉是目前最先进的射频紧肤技术，能够有效改善面部松弛、皱纹等问题。整个治疗过程舒适，无需恢复期，效果自然持久。

根据您的需求，我为您准备了详细的方案资料，方便您了解更多细节。有任何问题随时联系我！`,
      status: "pending",
    },
  })
  console.log("✓ 创建跟进任务")

  console.log("\n✅ 数据库初始化完成！")
  console.log("\n测试账号（手机号 / 密码）：")
  console.log("  咨询师: 13800000001 / 123456")
  console.log("  机构管理员: 13800000002 / 123456")
  console.log("  超级管理员: 13800000000 / 123456")
}

main()
  .catch((e) => {
    console.error("初始化失败:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
