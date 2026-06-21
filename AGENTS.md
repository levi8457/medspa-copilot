# AGENTS.md — 医美 AI 智能管家项目开发指南

> 本文件是 opencode（接入 DeepSeek 模型）的项目上下文与开发规范，所有 AI 辅助编码必须遵循。
> 产品需求详见 `PRD.md`，编码前先确认对应功能编号（F1~F8）。

## 1. 项目概览

医美机构咨询师的 AI 助理 SaaS：**录音 MP3 解析 → 客户标签生成 → 跟进策略生成 → 每日跟进执行**。
双端角色：机构管理员（看板/审核/团队）、咨询师（客户/录音/跟进工作台）。
多租户架构，机构间数据严格隔离。

## 2. 技术栈（不要擅自替换）

- **框架**：Next.js 14+ App Router + TypeScript（strict 模式）
- **UI**：shadcn/ui + Tailwind CSS，动效用 Framer Motion，图表用 ECharts
- **状态**：Zustand（客户端）+ TanStack Query（服务端状态）
- **表单**：React Hook Form + Zod
- **数据库**：PostgreSQL + Prisma ORM
- **队列**：Redis + BullMQ（录音解析异步任务）
- **存储**：S3 兼容 OSS（录音文件）
- **认证**：NextAuth.js（JWT + RBAC，三角色：super_admin / org_admin / consultant）
- **实时**：SSE（解析进度推送、LLM 流式输出）
- **AI**：DeepSeek API（chat 用于标签/话术生成，reasoner 用于复杂策略推理）；ASR 走云厂商 API
- **音频**：wavesurfer.js；**流程编排**：React Flow（SOP 编辑器）

## 3. 项目结构
. ├── AGENTS.md / PRD.md ├── prisma/schema.prisma # 数据模型唯一来源 ├── prompts/ # LLM Prompt 版本化管理（核心资产） │ ├── tag-extraction.md # 标签提取 │ ├── strategy-generation.md # 跟进策略生成 │ ├── script-generation.md # 话术生成 │ └── compliance-check.md # 医疗合规审查 ├── src/ │ ├── app/ │ │ ├── (auth)/ # 登录注册 │ │ ├── (consultant)/ # 咨询师端：dashboard/customers/recordings/sop │ │ ├── (admin)/ # 管理端：overview/team/review/settings │ │ └── api/ # API Routes（含 SSE 端点） │ ├── components/ │ │ ├── ui/ # shadcn 基础组件 │ │ └── futuristic/ # 科技感定制组件（GlowCard/HudPanel/TagCapsule/EnergyRing...） │ ├── lib/ │ │ ├── ai/ # DeepSeek 客户端、Prompt 加载、JSON Schema 校验 │ │ ├── asr/ # ASR 适配层（接口抽象，便于换供应商） │ │ ├── auth/ # RBAC 鉴权工具 │ │ └── db.ts # Prisma 实例（含多租户中间件） │ ├── workers/ # BullMQ Worker：解析流水线 │ └── styles/theme.css # 设计令牌（CSS variables）

## 4. 核心编码规范

### 4.1 多租户安全（最高优先级 ⚠️）
- **所有业务表必须包含 `orgId` 字段**，所有查询必须经过 Prisma 中间件自动注入 `orgId` 过滤
- 咨询师查询客户必须额外校验 `consultantId` 归属
- **禁止**在任何 API 中信任前端传入的 `orgId` —— 一律从 session 取
- 敏感操作（标签修改/SOP 审核/客户转移）必须写入 `AuditLog`

### 4.2 AI 调用规范
- 所有 LLM 调用走 `src/lib/ai/` 统一封装，禁止在组件/路由中直接调 API
- 标签提取必须用 JSON Schema 约束输出 + Zod 二次校验，校验失败自动重试（最多 2 次）
- 话术生成后**必须**经过 `compliance-check` 合规过滤才能返回给前端
- Prompt 修改只能改 `prompts/` 下的文件，不要在代码里硬编码 Prompt
- 长耗时任务（ASR + 解析）一律走 BullMQ，禁止在 API 路由中同步等待

### 4.3 UI 开发规范（未来科技感）
- **暗色优先**：默认暗色主题，背景 `#0A0E1A`，所有颜色用 `theme.css` 中的 CSS 变量，禁止硬编码色值
- 主色电光青 `--primary: #00E5FF`，辅助霓虹紫 `--accent: #7C4DFF`，成功 `#00FFA3`，警示 `#FFB300`，危险 `#FF4D6A`
- 卡片统一用 `<GlowCard>`（玻璃拟态 + 发光描边），不要直接用裸 div
- 数字展示用等宽字体 + count-up 动效；LLM 输出用打字机流式效果
- 动效统一用 Framer Motion，单次 ≤ 400ms，必须支持 `prefers-reduced-motion`
- 新增科技感组件放 `components/futuristic/`，保持可复用

### 4.4 通用规范
- TypeScript strict，禁止 `any`（确实需要时用 `unknown` + 类型收窄）
- 组件用函数式 + 具名导出；服务端组件优先，交互组件才加 `"use client"`
- API 返回统一结构：`{ success: boolean, data?: T, error?: { code, message } }`
- 错误信息中文面向用户，日志英文面向开发
- Git 提交用 Conventional Commits（feat/fix/refactor...）

## 5. 核心业务流程（实现时参照）

### 录音解析流水线（F1）
上传 MP3 → OSS 存储 → 创建 AudioRecord(status: pending) → 入队 BullMQ → Worker:

ASR 转写（说话人分离）→ 存 transcript 2. DeepSeek 标签提取（带原句定位 offset）→ 存 CustomerTag 3. DeepSeek 策略生成（标签 + 匹配 SOP 模板）→ 存 FollowUpPlan/Task 4. 状态流转 pending → transcribing → analyzing → done/failed → SSE 推送进度给前端（前端展示"AI 分析流"动效）

### 每日工作台（F3）
查询当日 FollowUpTask(consultantId, date=today, status=pending) → 按优先级排序渲染卡片流 → 点击卡片 → 调 DeepSeek 流式生成个性化话术（基于标签+策略+机构话术风格） → 合规过滤 → 打字机效果展示 → 一键复制 → 标记状态：done / skipped(需原因) / postponed

### SOP 审核状态机（F4/F7）
draft → submitted → approved（启用） └──→ rejected（驳回+意见）→ 可修改重新提交

## 6. 环境变量

```env
DATABASE_URL=            # PostgreSQL
REDIS_URL=               # Redis
DEEPSEEK_API_KEY=        # DeepSeek API
DEEPSEEK_BASE_URL=https://api.deepseek.com
ASR_PROVIDER=            # aliyun | tencent
ASR_API_KEY=
OSS_ENDPOINT= / OSS_BUCKET= / OSS_ACCESS_KEY= / OSS_SECRET_KEY=
NEXTAUTH_SECRET= / NEXTAUTH_URL=

## 7. 常用命令

pnpm dev              # 启动开发服务器
pnpm db:migrate       # prisma migrate dev
pnpm db:studio        # 数据库可视化
pnpm worker           # 启动 BullMQ Worker
pnpm lint && pnpm typecheck   # 提交前必须通过
docker compose up -d  # 本地启动 Postgres/Redis/MinIO

## 8. 开发优先级（按此顺序实现）
设计系统基建：theme.css + futuristic/ 基础组件（GlowCard/HudPanel/TagCapsule/EnergyRing）
认证 + 多租户中间件 + RBAC
Prisma 数据模型 + 迁移
F2 客户 CRUD + 列表 + 详情页
F1 录音上传 + 解析流水线（先 mock ASR，跑通 DeepSeek 标签提取）
F3 每日工作台 + 话术流式生成
F5~F8 管理端

## 9. 禁止事项
❌ 不要绕过多租户中间件直接裸查数据库
❌ 不要在前端暴露任何 API Key
❌ 不要让未经合规过滤的 AI 话术到达前端
❌ 不要硬编码颜色值/Prompt 文本
❌ 不要在 API 路由中同步执行 ASR/LLM 长任务
❌ 不要引入技术栈之外的重型依赖（如需新依赖，先在对话中说明理由）
