/**
 * ASR (Automatic Speech Recognition) 适配层
 * 支持多种 ASR 供应商，统一接口
 */

export interface ASRResult {
  /** 转写文本 */
  transcript: string
  /** 说话人分离结果 */
  speakerDiarization: SpeakerSegment[]
  /** 音频时长（秒） */
  duration: number
  /** 置信度 */
  confidence: number
}

export interface SpeakerSegment {
  speaker: "customer" | "consultant" | "unknown"
  text: string
  startTime: number
  endTime: number
  confidence: number
}

export interface ASRProvider {
  name: string
  transcribe(audioUrl: string, options?: ASROptions): Promise<ASRResult>
}

export interface ASROptions {
  /** 启用说话人分离 */
  enableSpeakerDiarization?: boolean
  /** 预期说话人数量 */
  speakerCount?: number
  /** 医疗术语热词 */
  hotwords?: string[]
  /** 语言 */
  language?: string
}

// 医美常用术语热词
export const MEDSPA_HOTWORDS = [
  // 项目名称
  "双眼皮", "开眼角", "隆鼻", "鼻综合", "面部吸脂", "下颌角",
  "热玛吉", "超声刀", "光子嫩肤", "皮秒", "蜂巢皮秒", "水光针",
  "玻尿酸", "肉毒素", "瘦脸针", "除皱针", "美白针",
  "脂肪填充", "自体脂肪", "假体隆胸", "自体隆胸",
  "线雕", "埋线", "蛋白线", "大线", "小线",
  "激光脱毛", "冰点脱毛",
  // 药品名称
  "衡力", "保妥适", "乔雅登", "瑞蓝", "伊婉", "艾莉薇",
  "嗨体", "菲洛嘉", "丝丽", "英诺",
  // 医学术语
  "麻醉", "局麻", "全麻", "肿胀", "恢复期", "拆线", "消肿",
]

/**
 * 创建 ASR 供应商实例
 */
export function createASRProvider(provider?: string): ASRProvider {
  const providerName = provider || process.env.ASR_PROVIDER || "mock"

  switch (providerName) {
    case "aliyun":
      return createAliyunASR()
    case "tencent":
      return createTencentASR()
    case "mock":
    default:
      return createMockASR()
  }
}

/**
 * Mock ASR 供应商（开发测试用）
 */
function createMockASR(): ASRProvider {
  return {
    name: "mock",
    async transcribe(audioUrl: string, options?: ASROptions): Promise<ASRResult> {
      // 模拟 ASR 处理延迟
      await new Promise((resolve) => setTimeout(resolve, 1000))

      return {
        transcript: "这是一段模拟的转写文本。实际使用时会调用真实的 ASR 服务。",
        speakerDiarization: [
          {
            speaker: "consultant",
            text: "您好，请问今天想了解什么项目？",
            startTime: 0,
            endTime: 3,
            confidence: 0.95,
          },
          {
            speaker: "customer",
            text: "我想了解一下热玛吉，听说效果不错。",
            startTime: 3,
            endTime: 6,
            confidence: 0.92,
          },
          {
            speaker: "consultant",
            text: "热玛吉是我们很受欢迎的项目，主要功效是紧致提升...",
            startTime: 6,
            endTime: 12,
            confidence: 0.94,
          },
        ],
        duration: 12,
        confidence: 0.93,
      }
    },
  }
}

/**
 * 阿里云 ASR 供应商
 * 使用阿里云 Paraformer 录音文件识别 API
 * 文档: https://help.aliyun.com/document_detail/90727.html
 */
function createAliyunASR(): ASRProvider {
  return {
    name: "aliyun",
    async transcribe(audioUrl: string, options?: ASROptions): Promise<ASRResult> {
      const apiKey = process.env.ASR_API_KEY
      const appId = process.env.ASR_APP_ID

      if (!apiKey || !appId) {
        throw new Error("阿里云 ASR 未配置：请设置 ASR_API_KEY 和 ASR_APP_ID")
      }

      // 提交录音文件识别任务
      const submitUrl = "https://nls-gateway.cn-shanghai.aliyuncs.com/dictation/asr/transcribe"

      const submitResponse = await fetch(submitUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-NLS-Token": apiKey,
        },
        body: JSON.stringify({
          appkey: appId,
          file_link: audioUrl,
          version: "4.0",
          enable_words: false,
          enable_sample_rate_adaptive: true,
          enable_speaker_diarization: options?.enableSpeakerDiarization ?? true,
          speaker_count: options?.speakerCount,
          hotwords_id: process.env.ASR_HOTWORDS_ID,
          hotwords_threshold: 0.8,
        }),
      })

      if (!submitResponse.ok) {
        throw new Error(`阿里云 ASR 提交失败: ${submitResponse.status} ${submitResponse.statusText}`)
      }

      const submitData = await submitResponse.json()

      if (submitData.status !== "SUCCESS" || !submitData.task_id) {
        throw new Error(`阿里云 ASR 提交失败: ${JSON.stringify(submitData)}`)
      }

      // 轮询任务状态
      const taskId = submitData.task_id
      const pollInterval = 3000 // 3 秒
      const maxAttempts = 60 // 最多等待 3 分钟

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval))

        const pollUrl = `${submitUrl}?task_id=${taskId}&appkey=${appId}`
        const pollResponse = await fetch(pollUrl, {
          headers: { "X-NLS-Token": apiKey },
        })

        if (!pollResponse.ok) {
          throw new Error(`阿里云 ASR 查询失败: ${pollResponse.status}`)
        }

        const pollData = await pollResponse.json()

        if (pollData.status === "SUCCESS") {
          return parseAliyunASRResult(pollData, options)
        }

        if (pollData.status === "FAILED") {
          throw new Error(`阿里云 ASR 处理失败: ${pollData.message || "未知错误"}`)
        }

        // 继续等待
      }

      throw new Error("阿里云 ASR 处理超时")
    },
  }
}

/**
 * 解析阿里云 ASR 返回结果
 */
function parseAliyunASRResult(data: Record<string, unknown>, options?: ASROptions): ASRResult {
  const result = data.result as Record<string, unknown> | undefined

  if (!result || !Array.isArray(result.sentences)) {
    return {
      transcript: "",
      speakerDiarization: [],
      duration: 0,
      confidence: 0,
    }
  }

  const sentences = result.sentences as Array<Record<string, unknown>>
  const duration = (result.duration as number) || 0

  const segments: SpeakerSegment[] = sentences.map((sentence) => {
    const speakerId = sentence.speaker_id as number | undefined
    // 偶数 speaker_id 为咨询师，奇数为客户（可根据实际情况调整）
    const speaker: "customer" | "consultant" | "unknown" =
      speakerId === undefined
        ? "unknown"
        : speakerId % 2 === 0
        ? "consultant"
        : "customer"

    return {
      speaker,
      text: (sentence.text as string) || "",
      startTime: (sentence.begin_time as number) || 0,
      endTime: (sentence.end_time as number) || 0,
      confidence: (sentence.confidence as number) || 0.9,
    }
  })

  const transcript = segments.map((seg) => seg.text).join("")
  const avgConfidence = segments.length > 0
    ? segments.reduce((sum, seg) => sum + seg.confidence, 0) / segments.length
    : 0

  return {
    transcript,
    speakerDiarization: segments,
    duration,
    confidence: avgConfidence,
  }
}

/**
 * 腾讯云 ASR 供应商
 */
function createTencentASR(): ASRProvider {
  return {
    name: "tencent",
    async transcribe(audioUrl: string, options?: ASROptions): Promise<ASRResult> {
      // TODO: 实现腾讯云 ASR 集成
      throw new Error("腾讯云 ASR 尚未实现，请使用 mock 模式或配置其他供应商")
    },
  }
}

/**
 * 将说话人分离结果转换为带标注的转写文本
 * 格式: [consultant] xxx\n[customer] xxx
 */
export function formatTranscriptWithSpeakers(segments: SpeakerSegment[]): string {
  return segments
    .map((seg) => `[${seg.speaker}] ${seg.text}`)
    .join("\n")
}