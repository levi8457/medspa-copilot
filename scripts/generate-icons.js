#!/usr/bin/env node
/**
 * 生成 PWA 图标（纯 JS，无依赖）
 * 生成 192x192 和 512x512 的 PNG 图标，使用医疗十字 + 科技感设计
 */
const fs = require("fs")
const path = require("path")
const zlib = require("zlib")

// PNG 工具函数
function crc32(buf) {
  const table = []
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii")
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function makePng(width, height, pixels) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  // 每行前加 filter byte (0)
  const raw = Buffer.alloc(height * (1 + width * 4))
  let pos = 0
  for (let y = 0; y < height; y++) {
    raw[pos++] = 0
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      raw[pos++] = pixels[idx]
      raw[pos++] = pixels[idx + 1]
      raw[pos++] = pixels[idx + 2]
      raw[pos++] = pixels[idx + 3]
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

// 颜色混合
function blend(c1, c2, t) {
  return Math.round(c1 + (c2 - c1) * t)
}

function lerpColor(c1, c2, t) {
  return [blend(c1[0], c2[0], t), blend(c1[1], c2[1], t), blend(c1[2], c2[2], t)]
}

// 生成图标像素
function generateIcon(size) {
  const pixels = Buffer.alloc(size * size * 4)
  const cx = size / 2
  const cy = size / 2

  // 圆角矩形半径
  const radius = size * 0.22

  // 颜色
  const bg1 = [10, 14, 26] // #0A0E1A
  const bg2 = [16, 23, 40] // #101728
  const cyan = [0, 229, 255] // #00E5FF
  const purple = [124, 77, 255] // #7C4DFF

  // 十字参数
  const crossWidth = size * 0.078 // 十字线宽
  const crossLength = size * 0.5625 // 十字长度
  const crossX = cx - crossWidth / 2
  const crossY = cy - crossLength / 2

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4

      // 圆角判断
      let inRoundedRect = true
      const margin = 0
      if (x < margin || x >= size - margin || y < margin || y >= size - margin) {
        inRoundedRect = false
      } else {
        const rx = x - margin
        const ry = y - margin
        const w = size - 2 * margin
        const h = size - 2 * margin
        // 检查是否在圆角内
        const cornerR = radius
        const inCorner =
          (rx < cornerR && ry < cornerR && (cornerR - rx) ** 2 + (cornerR - ry) ** 2 > cornerR ** 2) ||
          (rx >= w - cornerR && ry < cornerR && (rx - (w - cornerR)) ** 2 + (cornerR - ry) ** 2 > cornerR ** 2) ||
          (rx < cornerR && ry >= h - cornerR && (cornerR - rx) ** 2 + (ry - (h - cornerR)) ** 2 > cornerR ** 2) ||
          (rx >= w - cornerR && ry >= h - cornerR && (rx - (w - cornerR)) ** 2 + (ry - (h - cornerR)) ** 2 > cornerR ** 2)
        if (inCorner) inRoundedRect = false
      }

      if (!inRoundedRect) {
        // 透明
        pixels[idx] = 0
        pixels[idx + 1] = 0
        pixels[idx + 2] = 0
        pixels[idx + 3] = 0
        continue
      }

      // 背景渐变（左上到右下）
      const t = (x + y) / (2 * size)
      const bg = lerpColor(bg1, bg2, t)

      let r = bg[0]
      let g = bg[1]
      let b = bg[2]

      // 十字形状（带渐变 cyan -> purple）
      const inVertical = x >= crossX && x < crossX + crossWidth && y >= crossY && y < crossY + crossLength
      const inHorizontal = y >= crossY && y < crossY + crossWidth && x >= crossX && x < crossX + crossLength

      if (inVertical || inHorizontal) {
        const ct = (y + x) / (2 * size)
        const crossColor = lerpColor(cyan, purple, ct)
        r = crossColor[0]
        g = crossColor[1]
        b = crossColor[2]
      }

      // 中心发光点
      const distToCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      if (distToCenter < size * 0.04) {
        r = 0
        g = 229
        b = 255
      }

      // 描边（发光边框）
      const borderThickness = size * 0.023
      const innerMargin = borderThickness
      if (
        x < innerMargin ||
        x >= size - innerMargin ||
        y < innerMargin ||
        y >= size - innerMargin
      ) {
        // 描边带 cyan 半透明
        r = blend(r, cyan[0], 0.35)
        g = blend(g, cyan[1], 0.35)
        b = blend(b, cyan[2], 0.35)
      }

      pixels[idx] = Math.min(255, Math.max(0, r))
      pixels[idx + 1] = Math.min(255, Math.max(0, g))
      pixels[idx + 2] = Math.min(255, Math.max(0, b))
      pixels[idx + 3] = 255
    }
  }

  return pixels
}

// 主函数
function main() {
  const publicDir = path.join(__dirname, "..", "public")
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }

  const sizes = [192, 512]
  for (const size of sizes) {
    console.log(`生成 icon-${size}.png ...`)
    const pixels = generateIcon(size)
    const png = makePng(size, size, pixels)
    const filePath = path.join(publicDir, `icon-${size}.png`)
    fs.writeFileSync(filePath, png)
    console.log(`  ✓ ${filePath} (${png.length} bytes)`)
  }

  // 生成 apple-touch-icon (180x180)
  console.log(`生成 apple-touch-icon.png ...`)
  const applePixels = generateIcon(180)
  const applePng = makePng(180, 180, applePixels)
  const applePath = path.join(publicDir, "apple-touch-icon.png")
  fs.writeFileSync(applePath, applePng)
  console.log(`  ✓ ${applePath} (${applePng.length} bytes)`)

  // 生成 favicon-32x32.png
  console.log(`生成 favicon-32x32.png ...`)
  const favPixels = generateIcon(32)
  const favPng = makePng(32, 32, favPixels)
  const favPath = path.join(publicDir, "favicon-32x32.png")
  fs.writeFileSync(favPath, favPng)
  console.log(`  ✓ ${favPath} (${favPng.length} bytes)`)

  console.log("\n所有图标生成完成！")
}

main()
