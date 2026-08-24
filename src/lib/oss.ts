import OSS from "ali-oss"

/**
 * OSS 适配层 —— 上传录音文件到 S3 兼容 OSS
 * 使用 ali-oss SDK（阿里云 OSS 官方 SDK）
 */

let client: OSS | null = null

function getOSSClient(): OSS | null {
  // 如果没有配置 OSS 凭据，返回 null（降级为 mock 模式）
  if (!process.env.OSS_ENDPOINT || !process.env.OSS_BUCKET || !process.env.OSS_ACCESS_KEY || !process.env.OSS_SECRET_KEY) {
    return null
  }

  if (!client) {
    client = new OSS({
      region: process.env.OSS_REGION || "oss-cn-hangzhou",
      accessKeyId: process.env.OSS_ACCESS_KEY,
      accessKeySecret: process.env.OSS_SECRET_KEY,
      bucket: process.env.OSS_BUCKET,
      endpoint: process.env.OSS_ENDPOINT,
    })
  }

  return client
}

/**
 * 检查 OSS 是否已配置
 */
export function isOSSConfigured(): boolean {
  return getOSSClient() !== null
}

/**
 * 上传文件到 OSS
 * @param file 文件 Buffer
 * @param key 存储路径（如 recordings/xxx.mp3）
 * @returns Private object key. Consumers must request a short-lived signed URL.
 */
export async function uploadToOSS(file: Buffer, key: string): Promise<string> {
  const oss = getOSSClient()

  if (!oss) {
    // 降级：返回 mock URL（开发测试用）
    console.warn("[OSS] 未配置凭据，使用 mock URL")
    return `mock://${key}`
  }

  try {
    await oss.put(key, file)
    return key
  } catch (error) {
    console.error("[OSS] 上传失败:", error)
    throw new Error("文件上传失败，请检查 OSS 配置")
  }
}

/**
 * 生成签名访问 URL（私有 bucket）
 * @param key 存储路径
 * @param expires 过期时间（秒），默认 3600
 */
export async function getSignedUrl(key: string, expires: number = 3600): Promise<string> {
  const oss = getOSSClient()

  if (!oss) {
    return `mock://${key}`
  }

  try {
    return await oss.signatureUrl(key, { expires })
  } catch (error) {
    console.error("[OSS] 生成签名 URL 失败:", error)
    throw new Error("获取文件访问地址失败")
  }
}

/**
 * 生成录音文件存储路径
 */
export function generateRecordingKey(fileName: string, orgId: string): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)

  return `recordings/${orgId}/${year}${month}/${timestamp}-${random}-${fileName}`
}
