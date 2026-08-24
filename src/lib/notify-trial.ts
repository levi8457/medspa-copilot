// 试用申请通知：通过 agently-cli（腾讯 QQ 邮箱官方工具）发送邮件
import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

const AGENTLY = "agently-cli"
const NOTIFY_EMAIL = process.env.TRIAL_NOTIFY_EMAIL || "togens@agent.qq.com"

export interface TrialApplicationInfo {
  orgName: string
  contactName: string
  phone: string
  createdAt: Date
  trialEndsAt: Date
}

type AgentlyResponse = {
  ok?: boolean
  data?: { confirmation_token?: string }
}

function extractJson(stdout: string): AgentlyResponse {
  const start = stdout.indexOf("{")
  const end = stdout.lastIndexOf("}")
  if (start === -1 || end === -1) {
    throw new Error("无法解析 agently-cli 输出")
  }
  const parsed: unknown = JSON.parse(stdout.slice(start, end + 1))
  if (!parsed || typeof parsed !== "object") {
    throw new Error("agently-cli 返回格式无效")
  }
  return parsed as AgentlyResponse
}

async function sendWithAgently(args: string[]): Promise<AgentlyResponse> {
  const { stdout } = await execFileAsync(AGENTLY, args, {
    timeout: 30000,
    maxBuffer: 1024 * 1024,
  })
  return extractJson(stdout)
}

/**
 * 发送试用申请通知邮件（agently-cli 两阶段确认：先取 ctk，再带 ctk 发送）
 */
export async function notifyTrialApplication(info: TrialApplicationInfo): Promise<void> {
  const subject = `【MedSpa 试用申请】${info.orgName} / ${info.contactName} ${info.phone}`
  const body = [
    "有新的 MedSpa Copilot 试用申请：",
    "",
    `机构名称：${info.orgName}`,
    `联系人：${info.contactName}`,
    `手机号：${info.phone}`,
    `申请时间：${info.createdAt.toLocaleString("zh-CN")}`,
    `试用到期：${info.trialEndsAt.toLocaleString("zh-CN")}`,
    "",
    "请及时跟进该客户。",
  ].join("\n")

  const baseArgs = ["message", "+send", "--to", NOTIFY_EMAIL, "--subject", subject, "--body", body]

  // 第一步：获取 confirmation token
  const step1 = await sendWithAgently(baseArgs)
  const token = step1?.data?.confirmation_token
  if (!token) {
    throw new Error(`未获得 confirmation token: ${JSON.stringify(step1)}`)
  }

  // 第二步：携带 token 确认发送
  const step2 = await sendWithAgently([...baseArgs, "--confirmation-token", token])
  if (!step2?.ok) {
    throw new Error(`agently-cli 发送失败: ${JSON.stringify(step2)}`)
  }
}
