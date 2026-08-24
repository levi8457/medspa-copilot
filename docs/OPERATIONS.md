# 运行手册

## 服务启动

1. 从 `.env.example` 创建本地环境变量文件，并配置 PostgreSQL、Redis、DeepSeek、OSS 和腾讯云 ASR 凭据。
2. 启动 PostgreSQL 与 Redis 后执行 `pnpm db:migrate` 和 `pnpm db:generate`。
3. 分别启动应用 `pnpm dev`（或生产环境的 `pnpm build`、`pnpm start`）与解析 Worker `pnpm worker`。
4. 访问 `/medspa/api/health`。返回 HTTP `200` 且 `status: "ok"` 才代表数据库和 Redis 可用；HTTP `503` 表示应用不应接收录音解析流量。

## 录音故障排查

- `pending` 长时间不变：检查 Redis、Worker 进程和 BullMQ 队列积压。
- `failed`：查看服务端结构化错误日志中的录音 ID 与 Job ID；不得在日志中记录完整转写、签名 URL 或云密钥。
- 腾讯云 ASR 失败：确认录音对象为私有 OSS 对象、Worker 生成的签名 URL 尚未过期、腾讯云可访问该 URL，以及 `TENCENT_SECRET_ID`/`TENCENT_SECRET_KEY` 已生效。
- 标签为空：先检查转写与说话人分组。`unknown:<id>` 不能当作已认证客户，需使用已授权的咨询师角色认证或人工确认后再依赖高置信度客户标签。

## 安全与恢复

- `.env.local` 不提交版本库；一旦凭据出现在聊天记录、日志或工单中，立即在云控制台轮换。
- 录音播放只能经 `/api/recordings/:id/media` 获取短期签名重定向；禁止把 OSS 对象 URL 持久化或写入日志。
- 生产数据库变更只执行 Prisma migration。初始化 migration 只用于新 PostgreSQL 环境；SQLite 演示数据需先导出、校验、映射后再导入。
- 每日备份 PostgreSQL；定期演练从备份恢复到隔离环境，并验证机构隔离、录音元数据和任务状态。
