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
 */
function createAliyunASR(): ASRProvider {
  return {
    name: "aliyun",
    async transcribe(audioUrl: string, options?: ASROptions): Promise<ASRResult> {
      // TODO: 实现阿里云 Paraformer ASR 集成
      // 参考文档: https://help.aliyun.com/document_detail/84428.html
      throw new Error("阿里云 ASR 尚未实现，请使用 mock 模式或配置其他供应商")
    },
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