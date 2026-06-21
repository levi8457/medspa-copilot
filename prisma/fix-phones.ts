import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("更新用户手机号...")

  // 更新超级管理员
  await prisma.user.update({
    where: { email: "super@test.com" },
    data: { phone: "13800000000" },
  })
  console.log("✓ 超级管理员手机号已更新: 13800000000")

  // 更新机构管理员
  await prisma.user.update({
    where: { email: "admin@test.com" },
    data: { phone: "13800000002" },
  })
  console.log("✓ 机构管理员手机号已更新: 13800000002")

  // 更新咨询师
  await prisma.user.update({
    where: { email: "consultant@test.com" },
    data: { phone: "13800000001" },
  })
  console.log("✓ 咨询师手机号已更新: 13800000001")

  console.log("\n✅ 更新完成！")
  console.log("\n测试账号（手机号 / 密码）：")
  console.log("  咨询师: 13800000001 / 123456")
  console.log("  机构管理员: 13800000002 / 123456")
  console.log("  超级管理员: 13800000000 / 123456")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
