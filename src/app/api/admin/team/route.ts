import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session || session.user.role === "consultant") {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401 })
  }

  const orgId = session.user.orgId

  const users = await prisma.user.findMany({
    where: { orgId, role: "consultant" },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      _count: { select: { customers: true } },
    },
  })

  const members = await Promise.all(
    users.map(async (user) => {
      const [totalTasks, completedTasks, convertedCount] = await Promise.all([
        prisma.followUpTask.count({ where: { orgId, consultantId: user.id } }),
        prisma.followUpTask.count({ where: { orgId, consultantId: user.id, status: "done" } }),
        prisma.customer.count({ where: { orgId, consultantId: user.id, status: "converted" } }),
      ])

      const customerCount = user._count.customers

      return {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: `${user.phone}@${orgId.slice(0, 8)}.local`,
        role: user.role,
        customers: customerCount,
        conversionRate: customerCount > 0 ? Math.round((convertedCount / customerCount) * 1000) / 10 : 0,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 1000) / 10 : 0,
        isActive: user.isActive,
      }
    })
  )

  const activeMembers = members.filter((m) => m.isActive)

  return NextResponse.json({
    success: true,
    data: {
      members,
      stats: {
        totalMembers: members.length,
        activeMembers: activeMembers.length,
        avgConversionRate: members.length > 0 ? Math.round(members.reduce((s, m) => s + m.conversionRate, 0) / members.length * 10) / 10 : 0,
        avgCompletionRate: members.length > 0 ? Math.round(members.reduce((s, m) => s + m.completionRate, 0) / members.length * 10) / 10 : 0,
      },
    },
  })
}
