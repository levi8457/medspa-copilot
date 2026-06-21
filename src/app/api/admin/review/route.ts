import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session || session.user.role === "consultant") {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401 })
  }

  const orgId = session.user.orgId

  const sops = await prisma.sopTemplate.findMany({
    where: { orgId, status: "submitted" },
    orderBy: { createdAt: "desc" },
  })

  const creatorIds = [...new Set(sops.map((s) => s.creatorId))]
  const creators = await prisma.user.findMany({
    where: { id: { in: creatorIds } },
    select: { id: true, name: true },
  })
  const creatorMap = Object.fromEntries(creators.map((c) => [c.id, c.name]))

  const items = sops.map((sop) => ({
    id: sop.id,
    type: "sop" as const,
    title: sop.name,
    content: sop.description || "",
    creator: creatorMap[sop.creatorId] || "未知",
    status: sop.status,
    createdAt: sop.createdAt.toISOString(),
  }))

  return NextResponse.json({ success: true, data: items })
}
