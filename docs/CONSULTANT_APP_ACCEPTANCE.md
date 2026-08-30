# 咨询师移动端 P0 测试验收标准

## 测试前准备

1. 在服务器执行最新数据库迁移，并启动 Web 服务、Redis 和 Worker。
2. 在服务器 `.env` 中填写 `TENCENT_ASR_APP_ID`，并确认 `ASR_PROVIDER=tencent`、`TENCENT_SECRET_ID`、`TENCENT_SECRET_KEY`、`TENCENT_ASR_HOTWORD_ID` 与 PC 端使用同一套机构配置。
3. 使用一个 `consultant` 账号登录；该账号至少有一位本人名下客户和一条今日待办。
4. 管理员在“话术库”准备至少一条机构级话术，并确保其 `approvalStatus` 为 `approved`。建议标签中包含“恢复期”或“价格”。
5. 使用手机浏览器打开 `/medspa/mobile`，或在桌面浏览器的移动设备模式测试；iOS 原生包测试另见 [IOS_APPSTORE_RELEASE_SOP.md](./IOS_APPSTORE_RELEASE_SOP.md)。
6. 全程使用脱敏测试客户和虚构对话，不录入真实客户隐私。

## 必须通过的验收项

| 编号 | 操作 | 预期结果 |
| --- | --- | --- |
| M-01 | 用咨询师账号打开移动端 | 首页显示本人今日待办；不显示其他咨询师任务。 |
| M-02 | 点击任务右侧完成按钮 | 任务从列表移除，Web 端客户时间线新增完成记录。 |
| M-03 | 在现场咨询选择本人客户并点击开始 | 创建一条 `draft` 会话；不能选择不属于自己的客户。 |
| M-04 | 不点击“客户已同意”，直接提交确认文本 | 被拒绝，页面提示必须先完成客户同意。 |
| M-05 | 确认客户同意录音 | 创建授权记录，会话变成 `recording`，并写入审计日志。 |
| M-06 | 输入“我担心恢复期影响上班”，点击保存并查找 | 只返回机构级、审核通过且合规检查通过的话术；无合适话术时明确提示，不返回 AI 兜底文本。 |
| M-07 | 结束现场咨询 | 会话状态变为 `completed`，不能再次写入转写片段。 |
| M-08 | 用另一位咨询师账号直接访问第一位咨询师的会话 API | 返回 `404` 或 `403`，绝不能返回会话、转写或建议内容。 |
| M-09 | 断开 DeepSeek Key 或让合规服务失败，再请求话术 | 不显示任何候选话术，页面提示没有可安全展示的内容。 |
| M-10 | 客户同意后点击“开启实时转写”，允许麦克风权限并说一句测试语 | 页面显示临时或稳定转写；稳定句子保存到会话，并自动查询机构话术。 |
| M-11 | 点击“停止实时转写”或“结束现场咨询” | 浏览器麦克风指示关闭；后续不再上传音频。 |
| M-12 | 在页面和浏览器网络请求中检查 | 不出现腾讯云 SecretKey、OSS 长期地址或完整音频链接。短期签名 URL 只在已授权的进行中会话内使用，5 分钟后失效。 |
| M-13 | 实时转写中切到后台或锁屏后返回 | 麦克风立即停止；返回后需手动再次开启实时转写，不能在后台继续采集。 |
| M-14 | 在“我的与隐私”提交账号删除申请 | 第一次创建申请并写入审计日志；重复提交返回同一未完成申请，不创建重复工单。 |

## 当前版本边界

1. 现场页面已支持腾讯云实时 WebSocket 转写；没有配置 `TENCENT_ASR_APP_ID` 时会安全失败，并提示改用手动记录。
2. “确认后的客户原话”输入框仍保留，用于弱网、ASR 故障和测试话术闭环。
3. 原生 App 的后台录音、弱网音频续传和完整音频上传仍需在实机 POC 后单独实现；浏览器版不承诺退到后台后持续录音。

## 自动化验证命令

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\tsx.cmd --test src/lib/db-tenant.test.ts src/lib/asr/index.test.ts src/lib/mobile/consultation.test.ts
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5433/medspa_copilot?schema=public'
.\node_modules\.bin\prisma.cmd validate --schema prisma/schema.prisma
```

自动化测试通过只代表类型、核心租户范围和话术匹配逻辑正常，不能替代上表的登录态、数据库和真实机构数据验收。
