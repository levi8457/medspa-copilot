import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/db"

// CSV 批量导入线索
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role === "consultant") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "无权操作" } },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file")
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "请上传文件" } },
        { status: 400 }
      )
    }

    const text = await file.text()
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "文件内容为空" } },
        { status: 400 }
      )
    }

    // 解析表头，定位字段下标
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase())
    const idx = {
      name: header.findIndex((h) => h.includes("name") || h.includes("姓名")),
      phone: header.findIndex((h) => h.includes("phone") || h.includes("手机") || h.includes("电话")),
      wechat: header.findIndex((h) => h.includes("wechat") || h.includes("微信")),
      source: header.findIndex((h) => h.includes("source") || h.includes("来源")),
    }

    const orgId = session.user.orgId
    let successCount = 0
    const errors: { row: number; message: string }[] = []

    // 如果只有一列且没有表头匹配，把每行当姓名
    const hasHeader = Object.values(idx).some((i) => i >= 0)
    const dataLines = hasHeader ? lines.slice(1) : lines

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i]
        const cells = line.split(",").map((c) => c.trim())

        const name = hasHeader
          ? idx.name >= 0
            ? cells[idx.name] || ""
            : cells[0] || ""
          : cells[0] || ""

        if (!name) {
          errors.push({ row: i + 1, message: "姓名为空" })
          continue
        }

        const phone =
          hasHeader && idx.phone >= 0 ? cells[idx.phone] || null : cells[1] || null
        const wechat =
          hasHeader && idx.wechat >= 0 ? cells[idx.wechat] || null : null
        const source =
          hasHeader && idx.source >= 0 ? cells[idx.source] || null : null

        try {
          await tx.customer.create({
            data: {
              orgId,
              name,
              phone,
              wechat,
              source,
              status: "lead",
            },
          })
          successCount++
        } catch (e) {
          errors.push({
            row: i + 1,
            message: e instanceof Error ? e.message : "创建失败",
          })
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        total: dataLines.length,
        success: successCount,
        failed: errors.length,
        errors: errors.slice(0, 20),
      },
    })
  } catch (error) {
    console.error("批量导入线索失败:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "批量导入失败" } },
      { status: 500 }
    )
  }
}
