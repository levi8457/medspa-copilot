import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { withTenantFilter, getUserId } from "@/lib/db-tenant"
import { addAudioProcessingJob } from "@/lib/queue"
import { processAudioJob } from "@/workers/audio-processor"

// GET - 获取录音列表
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const customerId = searchParams.get("customerId")
  const status = searchParams.get("status")
  const page = parseInt(searchParams.get("page") || "1")
  const pageSize = parseInt(searchParams.get("pageSize") || "20")

  const where: Record<string, unknown> = {}
  if (customerId) where.customerId = customerId
  if (status) where.status = status

  const baseArgs = {
    where,
    orderBy: { createdAt: "desc" as const },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      customer: { select: { id: true, name: true } },
    },
  }

  const args = withTenantFilter("AudioRecord", session, baseArgs)

  const [recordings, total] = await Promise.all([
    prisma.audioRecord.findMany(args as Parameters<typeof prisma.audioRecord.findMany>[0]),
    prisma.audioRecord.count({ where: args.where as Record<string, unknown> }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      recordings,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  })
}

// POST - 上传录音
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const customerId = formData.get("customerId") as string | null

    if (!file) {
      return NextResponse.json({ success: false, error: { code: "NO_FILE", message: "请选择录音文件" } }, { status: 400 })
    }

    if (!customerId) {
      return NextResponse.json({ success: false, error: { code: "NO_CUSTOMER", message: "请选择关联客户" } }, { status: 400 })
    }

    // 验证文件类型
    const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: { code: "INVALID_TYPE", message: "仅支持 MP3/WAV/OGG 格式" } }, { status: 400 })
    }

    // 验证文件大小 (200MB)
    if (file.size > 200 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: { code: "FILE_TOO_LARGE", message: "文件大小不能超过 200MB" } }, { status: 400 })
    }

    // 验证客户归属
    const userId = getUserId(session)
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        orgId: session.user.orgId,
        consultantId: session.user.role === "consultant" ? userId : undefined,
      },
    })

    if (!customer) {
      return NextResponse.json({ success: false, error: { code: "CUSTOMER_NOT_FOUND", message: "客户不存在" } }, { status: 404 })
    }

    // TODO: 上传到 OSS (目前使用 mock URL)
    const ossUrl = `mock://recordings/${Date.now()}-${file.name}`

    // 创建录音记录
    const recording = await prisma.audioRecord.create({
      data: {
        orgId: session.user.orgId,
        customerId,
        consultantId: userId,
        fileName: file.name,
        fileSize: file.size,
        duration: 0, // 将在 ASR 处理后更新
        ossUrl,
        status: "pending",
      },
    })

    // 入队 BullMQ 任务进行异步处理
    try {
      await addAudioProcessingJob({
        recordingId: recording.id,
        orgId: session.user.orgId,
        customerId,
        consultantId: userId,
        ossUrl,
      })
    } catch (queueError) {
      console.error("入队失败，降级为同步处理:", queueError)
      // 降级：直接调用处理函数（不经过队列）
      processAudioJob({
        recordingId: recording.id,
        orgId: session.user.orgId,
        customerId,
        consultantId: userId,
        ossUrl,
      }).catch((err) => console.error("同步处理失败:", err))
    }

    return NextResponse.json({
      success: true,
      data: {
        id: recording.id,
        status: recording.status,
        message: "录音上传成功，正在处理中",
      },
    })
  } catch (error) {
    console.error("上传录音失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "上传失败，请稍后重试" } },
      { status: 500 }
    )
  }
}