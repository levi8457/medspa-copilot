import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("创建测试客户数据...")

  // 获取咨询师用户
  const consultant = await prisma.user.findFirst({
    where: { role: "consultant" },
  })

  if (!consultant) {
    console.log("未找到咨询师用户，请先运行 seed.ts")
    return
  }

  // 创建测试客户
  const customers = [
    {
      name: "李女士",
      phone: "13912345678",
      wechat: "li_xiaojie_2024",
      age: 32,
      gender: "女",
      source: "小红书",
      status: "negotiating",
      notes: "对热玛吉感兴趣，预算充足",
    },
    {
      name: "王小姐",
      phone: "13887654321",
      wechat: "wang_xiaojie",
      age: 28,
      gender: "女",
      source: "朋友推荐",
      status: "lead",
      notes: "想了解玻尿酸填充",
    },
    {
      name: "张女士",
      phone: "13711112222",
      age: 45,
      gender: "女",
      source: "抖音",
      status: "converted",
      notes: "已购买热玛吉套餐",
    },
    {
      name: "陈先生",
      phone: "13633334444",
      wechat: "chen_xiansheng",
      age: 38,
      gender: "男",
      source: "大众点评",
      status: "contacted",
      notes: "咨询植发项目",
    },
    {
      name: "刘女士",
      phone: "13555556666",
      age: 35,
      gender: "女",
      source: "到店咨询",
      status: "negotiating",
      notes: "对比多家机构，价格敏感",
    },
  ]

  for (const customerData of customers) {
    const customer = await prisma.customer.create({
      data: {
        orgId: consultant.orgId,
        consultantId: consultant.id,
        ...customerData,
      },
    })

    // 为每个客户创建标签
    const tags = []
    if (customerData.status === "negotiating") {
      tags.push({ dimension: "需求意向", value: "高意向" })
      tags.push({ dimension: "预算", value: "高预算" })
    } else if (customerData.status === "lead") {
      tags.push({ dimension: "需求意向", value: "中等意向" })
    } else if (customerData.status === "converted") {
      tags.push({ dimension: "需求意向", value: "高意向" })
      tags.push({ dimension: "预算", value: "高预算" })
    }

    // 根据备注添加标签
    if (customerData.notes?.includes("价格敏感")) {
      tags.push({ dimension: "预算", value: "价格敏感" })
    }
    if (customerData.notes?.includes("热玛吉")) {
      tags.push({ dimension: "项目偏好", value: "热玛吉" })
    }
    if (customerData.notes?.includes("玻尿酸")) {
      tags.push({ dimension: "项目偏好", value: "玻尿酸" })
    }
    if (customerData.notes?.includes("植发")) {
      tags.push({ dimension: "项目偏好", value: "植发" })
    }

    for (const tag of tags) {
      await prisma.customerTag.create({
        data: {
          orgId: consultant.orgId,
          customerId: customer.id,
          dimension: tag.dimension,
          value: tag.value,
        },
      })
    }

    // 创建时间线事件
    await prisma.timelineEvent.create({
      data: {
        orgId: consultant.orgId,
        customerId: customer.id,
        type: "note",
        title: "创建客户档案",
        content: `客户 ${customerData.name} 的档案已创建`,
      },
    })

    console.log(`✓ 创建客户: ${customerData.name}`)
  }

  console.log("\n✅ 测试客户数据创建完成！")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
