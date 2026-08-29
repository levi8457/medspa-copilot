import { createHmac, randomInt, randomUUID } from "node:crypto"

export interface RealtimeASRSession {
  provider: "tencent"
  url: string
  voiceId: string
  expiresAt: number
  audio: {
    sampleRate: 16000
    channels: 1
    format: "pcm_s16le"
    packetBytes: 6400
  }
}

interface TencentRealtimeConfig {
  appId: string
  secretId: string
  secretKey: string
  engineModelType: string
  hotwordId?: string
}

const TENCENT_REALTIME_HOST = "asr.cloud.tencent.com"

/**
 * Creates a short-lived browser connection for Tencent realtime ASR.
 * The mobile client receives a signed URL only; SecretKey remains server-side.
 */
export function createRealtimeASRSession(provider = process.env.ASR_PROVIDER): RealtimeASRSession {
  if (provider !== "tencent") {
    throw new Error("当前 ASR 供应商未配置实时转写，请启用腾讯云实时语音识别")
  }

  const appId = process.env.TENCENT_ASR_APP_ID
  const secretId = process.env.TENCENT_SECRET_ID
  const secretKey = process.env.TENCENT_SECRET_KEY
  if (!appId || !secretId || !secretKey) {
    throw new Error("腾讯云实时 ASR 未配置：请设置 TENCENT_ASR_APP_ID、TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY")
  }

  return buildTencentRealtimeSession({
    appId,
    secretId,
    secretKey,
    engineModelType: process.env.TENCENT_REALTIME_ASR_ENGINE || "16k_zh_en",
    hotwordId: process.env.TENCENT_ASR_HOTWORD_ID || undefined,
  })
}

export function buildTencentRealtimeSession(config: TencentRealtimeConfig, nowSeconds = Math.floor(Date.now() / 1000)): RealtimeASRSession {
  const voiceId = randomUUID()
  const expiresAt = nowSeconds + 5 * 60
  const params: Record<string, string> = {
    engine_model_type: config.engineModelType,
    expired: String(expiresAt),
    filter_empty_result: "1",
    needvad: "1",
    nonce: String(randomInt(100000000, 999999999)),
    secretid: config.secretId,
    timestamp: String(nowSeconds),
    voice_format: "1",
    voice_id: voiceId,
    word_info: "2",
  }
  if (config.hotwordId) params.hotword_id = config.hotwordId

  const sortedQuery = Object.keys(params)
    .sort()
    .map((key) => `${key}=${encodeURIComponent(params[key])}`)
    .join("&")
  const signingSource = `${TENCENT_REALTIME_HOST}/asr/v2/${config.appId}?${sortedQuery}`
  const signature = createHmac("sha1", config.secretKey).update(signingSource, "utf8").digest("base64")
  const url = `wss://${signingSource}&signature=${encodeURIComponent(signature)}`

  return {
    provider: "tencent",
    url,
    voiceId,
    expiresAt,
    audio: { sampleRate: 16000, channels: 1, format: "pcm_s16le", packetBytes: 6400 },
  }
}
