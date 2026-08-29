import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const actionSchema = z.object({ displayState: z.enum(["expanded", "copied", "dismissed"]) })

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  if (session.user.role !== "consultant") return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "权限不足" } }, { status: 403 })
  const { id } = await params
  const body = actionSchema.safeParse(await request.json())
  if (!body.success) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "建议操作无效" } }, { status: 400 })

  const suggestion = await prisma.realtimeSuggestion.findFirst({
    where: { id, orgId: session.user.orgId, consultationSession: { consultantId: session.user.id } },
  })
  if (!suggestion) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "建议不存在或无权操作" } }, { status: 404 })

  const updated = await prisma.realtimeSuggestion.update({ where: { id }, data: { displayState: body.data.displayState } })
  return NextResponse.json({ success: true, data: updated })
}
