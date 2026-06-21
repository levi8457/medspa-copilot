import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { withTenantFilter, validateResourceOwnership } from "@/lib/db-tenant"

// GET - 获取单个录音详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  }

  const { id } = await params

  const hasAccess = await validateResourceOwnership("AudioRecord", id, session)
  if (!hasAccess) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "无权访问此录音" } }, { status: 403 })
  }

  const recording = await prisma.audioRecord.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      tags: true,
    },
  })

  if (!recording) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "录音不存在" } }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: recording })
}

// PATCH - 更新录音状态（用于手动触发解析或标记状态）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  }

  const { id } = await params

  const hasAccess = await validateResourceOwnership("AudioRecord", id, session)
  if (!hasAccess) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "无权操作此录音" } }, { status: 403 })
  }

  const body = await request.json()
  const { status, transcript } = body

  const updateData: Record<string, unknown> = {}
  if (status) updateData.status = status
  if (transcript) updateData.transcript = transcript

  const recording = await prisma.audioRecord.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json({ success: true, data: recording })
}

// DELETE - 删除录音
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  }

  const { id } = await params

  const hasAccess = await validateResourceOwnership("AudioRecord", id, session)
  if (!hasAccess) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "无权删除此录音" } }, { status: 403 })
  }

  await prisma.audioRecord.delete({ where: { id } })

  return NextResponse.json({ success: true, data: { message: "删除成功" } })
}