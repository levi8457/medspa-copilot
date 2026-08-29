import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { complianceCheck } from "@/lib/ai/compliance-check"
import { prisma } from "@/lib/db"
import { consultationWhere, isConsultant, rankScriptForTrigger } from "@/lib/mobile/consultation"

const suggestionSchema = z.object({
  triggerText: z.string().trim().min(2, "请至少输入两个字的客户原话").max(500, "客户原话不能超过 500 字"),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  if (!isConsultant(session)) return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "仅咨询师可获取现场建议" } }, { status: 403 })
  const { id } = await params
  const body = suggestionSchema.safeParse(await request.json())
  if (!body.success) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: body.error.issues[0]?.message ?? "建议参数无效" } }, { status: 400 })

  const consultation = await prisma.consultationSession.findFirst({ where: consultationWhere(session, id) })
  if (!consultation) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "现场咨询不存在或无权访问" } }, { status: 404 })
  if (consultation.status !== "recording") return NextResponse.json({ success: false, error: { code: "CONSENT_REQUIRED", message: "取得客户录音同意后才能获取现场建议" } }, { status: 409 })

  const candidates = await prisma.scriptLibrary.findMany({
    where: { orgId: consultation.orgId, isOrgLevel: true, approvalStatus: "approved" },
    select: { id: true, title: true, content: true, category: true, tags: true, useCount: true },
    take: 80,
  })
  const ranked = candidates
    .map((script) => ({ script, score: rankScriptForTrigger(script, body.data.triggerText) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)

  // Re-check even approved assets before showing them in a live medical-sales context.
  const checked = await Promise.all(ranked.map(async ({ script }) => ({ script, compliance: await complianceCheck({ script: script.content }) })))
  const safe = checked.filter(({ compliance }) => compliance.passed)
  const suggestions = await prisma.$transaction(async (tx) => Promise.all(safe.map(({ script, compliance }) => tx.realtimeSuggestion.create({
    data: {
      orgId: consultation.orgId,
      consultationSessionId: consultation.id,
      triggerText: body.data.triggerText,
      sourceType: "org_script",
      sourceId: script.id,
      content: script.content,
      complianceResult: JSON.stringify(compliance),
    },
  }))))

  return NextResponse.json({
    success: true,
    data: {
      suggestions: suggestions.map((suggestion) => ({ id: suggestion.id, content: suggestion.content, sourceType: suggestion.sourceType, reason: "匹配机构已审核话术" })),
      message: suggestions.length === 0 ? "未找到可安全展示的机构话术" : undefined,
    },
  })
}
