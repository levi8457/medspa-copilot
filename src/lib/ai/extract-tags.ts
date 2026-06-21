import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai"; // DeepSeek 兼容 OpenAI SDK
import {
  parseTagExtractionResult,
  type TagExtractionResult,
} from "./tag-extraction.schema";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
});

/** 从 prompts/ 目录加载 Prompt 文件（禁止硬编码 Prompt） */
function loadPrompt(filename: string): string {
  return fs.readFileSync(
    path.join(process.cwd(), "prompts", filename),
    "utf-8"
  );
}

/** 从 tag-extraction.md 中提取 System Prompt 段落 */
function getSystemPrompt(): string {
  const full = loadPrompt("tag-extraction.md");
  // 截取 "## System Prompt" 到 "## User Prompt 模板" 之间的内容
  const match = full.match(/## System Prompt([\s\S]*?)## User Prompt/);
  if (!match) throw new Error("tag-extraction.md 格式错误：找不到 System Prompt 段落");
  return match[1].trim();
}

interface ExtractTagsInput {
  /** 带说话人标注的转写文本，格式：[customer] xxx\n[consultant] xxx */
  transcriptWithSpeakers: string;
  /** 客户已有信息（可选），JSON 字符串或描述文本 */
  existingCustomerInfo?: string;
}

const MAX_RETRIES = 2;

/**
 * 标签提取主函数
 * 失败自动重试（最多 2 次），重试时把校验错误反馈给模型自我修正
 */
export async function extractTags(
  input: ExtractTagsInput
): Promise<TagExtractionResult> {
  const systemPrompt = getSystemPrompt();

  const userPrompt = [
    "以下是一段医美面谈对话转写，说话人已标注（consultant=咨询师，customer=客户）。",
    "请按照规则提取客户标签，严格输出 JSON。",
    "",
    "【客户已有信息】",
    input.existingCustomerInfo?.trim() || "（无）",
    "",
    "【对话转写】",
    input.transcriptWithSpeakers,
  ].join("\n");

  let lastError = "";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    // 重试时附加上一次的校验错误，让模型自我修正
    if (attempt > 0) {
      messages.push({
        role: "user",
        content: `你上一次的输出未通过格式校验，错误信息：${lastError}\n请修正后重新输出完整 JSON。`,
      });
    }

    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages,
      response_format: { type: "json_object" }, // 强制 JSON 输出
      temperature: 0.2, // 低温度保证提取稳定性
      max_tokens: 4096,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const result = parseTagExtractionResult(raw);

    if (result.success) {
      return result.data;
    }

    lastError = result.error;
    console.warn(
      `[extractTags] attempt ${attempt + 1} failed: ${lastError}`
    );
  }

  throw new Error(
    `Tag extraction failed after ${MAX_RETRIES + 1} attempts: ${lastError}`
  );
}
