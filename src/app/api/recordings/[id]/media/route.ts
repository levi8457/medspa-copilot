import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { validateResourceOwnership } from "@/lib/db-tenant"
import { getSignedUrl, isOSSConfigured } from "@/lib/oss"

const PLAYBACK_URL_TTL_SECONDS = 15 * 60

// GET - Authorize audio playback, then redirect to a short-lived OSS URL.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
      { status: 401 }
    )
  }

  const { id } = await params
  const hasAccess = await validateResourceOwnership("AudioRecord", id, session)
  if (!hasAccess) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "无权播放此录音" } },
      { status: 403 }
    )
  }
  if (!isOSSConfigured()) {
    return NextResponse.json(
      { success: false, error: { code: "STORAGE_UNAVAILABLE", message: "录音存储服务未配置" } },
      { status: 503 }
    )
  }

  const recording = await prisma.audioRecord.findUnique({
    where: { id },
    select: { ossUrl: true },
  })
  if (!recording) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "录音不存在" } },
      { status: 404 }
    )
  }

  const signedUrl = await getSignedUrl(recording.ossUrl, PLAYBACK_URL_TTL_SECONDS)
  return NextResponse.redirect(signedUrl)
}
