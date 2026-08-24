# 医美 AI 智能管家上线操作 SOP（照着做即可）

这份文档不要求你会写代码。按顺序完成即可；遇到报错时，先复制报错文字或截图给开发人员，不要自行删除数据库、文件或服务器目录。

## 先看结论

系统要真正可用，除了代码以外，还需要五样东西：

1. 一台服务器：运行网站和后台任务。
2. PostgreSQL 数据库：保存客户、录音记录、标签和跟进任务。
3. Redis：让录音解析任务排队执行。
4. 对象存储 OSS：保存 MP3 录音文件。
5. DeepSeek 与腾讯云 ASR：分别负责 AI 分析和录音转文字。

代码同步、发布脚本和数据库迁移文件已放在项目内。你只需把下面的账号和环境配置补齐，并按文档进行一次验收。

## 第 0 步：先处理密钥安全

你之前曾在聊天内容中发送过腾讯云密钥。把它视为已经泄露，必须先到腾讯云控制台删除或禁用旧密钥，再新建一对密钥。

不要把任何密码、SecretKey、数据库连接地址完整内容发到聊天里，也不要把它们提交到 GitHub。它们只应填写在服务器的 `.env` 文件中。

## 第 1 步：登录 114 服务器

1. 在 Windows 打开“Windows Terminal”或 PowerShell。
2. 输入下面命令后按回车，把 `root` 的服务器密码手动输入到密码提示处：

```powershell
ssh root@114.55.129.160
```

3. 登录成功后输入下面命令，确认你看到了项目目录：

```bash
cd /opt/medspa-copilot
pwd
git status --short
```

正常情况：第一行输出 `/opt/medspa-copilot`，第二个命令没有输出或只显示你明确知道的改动。

如果出现不认识的改动，先停下，不要执行发布脚本。截图给开发人员确认，避免覆盖服务器上的人工修改。

## 第 2 步：在服务器填写运行配置

1. 在服务器项目目录执行：

```bash
cp .env.example .env
nano .env
```

2. 将下面这些项目替换成你自己的真实值。等号右边的引号可保留。

```env
# 数据库和任务队列
DATABASE_URL="你的 PostgreSQL 连接地址"
REDIS_URL="你的 Redis 连接地址"

# 网站登录
NEXTAUTH_SECRET="一段随机且足够长的字符"
NEXTAUTH_URL="你的正式网站地址，例如 https://你的域名/medspa"
AUTH_TRUST_HOST="true"

# DeepSeek AI
DEEPSEEK_API_KEY="你的 DeepSeek API Key"
DEEPSEEK_BASE_URL="https://api.deepseek.com"

# 腾讯云录音文件识别
ASR_PROVIDER="tencent"
TENCENT_SECRET_ID="新建后的腾讯云 SecretId"
TENCENT_SECRET_KEY="新建后的腾讯云 SecretKey"
TENCENT_ASR_REGION="ap-guangzhou"
TENCENT_ASR_HOTWORD_ID="腾讯云热词表 ID，没有可先留空"

# 录音存储 OSS
OSS_ENDPOINT="你的 OSS Endpoint"
OSS_BUCKET="你的 Bucket 名称"
OSS_ACCESS_KEY="你的 OSS AccessKey"
OSS_SECRET_KEY="你的 OSS SecretKey"
```

3. 保存方式：在 `nano` 中按 `Ctrl+O`，回车，再按 `Ctrl+X`。
4. 立刻限制文件权限：

```bash
chmod 600 .env
```

说明：`.env` 是服务器私密配置。以后更新代码时不需要重新创建它，发布脚本也不会上传它到 GitHub。

## 第 3 步：准备腾讯云 ASR

1. 登录腾讯云控制台，进入“访问管理”。
2. 新建一个子账号，仅授予“录音文件识别”和所需存储读取权限；不要使用主账号密钥。
3. 为子账号创建 API 密钥，填入服务器 `.env` 的 `TENCENT_SECRET_ID` 与 `TENCENT_SECRET_KEY`。
4. 打开“录音文件识别”服务。系统默认使用中文普通话与英文混合引擎 `16k_zh_en_2.0`。
5. 可选但建议：创建热词表，加入本机构常用的项目名、品牌名、药械名和医生名；将热词表 ID 填入 `TENCENT_ASR_HOTWORD_ID`。
6. 每次改热词表后，用 3 到 5 条已脱敏录音检查识别是否变差，并记录修改日期和效果。

注意：腾讯云 ASR 的说话人编号只代表“分组”，不代表“客户”或“咨询师”。系统会把无法可靠确认的角色标为 `unknown`，这是刻意的隐私和准确性保护。

## 第 4 步：准备 OSS 录音存储

1. 在 OSS 创建一个**私有** Bucket，禁止公共读。
2. 为应用创建最小权限的 AccessKey，只允许该 Bucket 的读写，不要给全账号管理权限。
3. 把 Endpoint、Bucket 和 AccessKey 填入服务器 `.env`。
4. 确保腾讯云 ASR 能访问应用生成的短期签名链接。不要把录音设置成永久公开链接。
5. 用一段不含客户隐私的测试 MP3 上传一次，确认 Bucket 中能看到文件。

## 第 5 步：发布代码

确认第 1 步中没有不认识的服务器改动后，在服务器执行：

```bash
cd /opt/medspa-copilot
bash deploy.sh
```

这个命令会自动完成：下载 GitHub 最新代码、安装依赖、执行数据库迁移、构建网站、重启网站和录音解析 Worker。

出现 `部署完成` 不代表全部验证结束，请继续下一步。

## 第 6 步：检查网站是否真的正常

在服务器执行：

```bash
curl -i http://127.0.0.1:3010/medspa/api/health
```

正常情况：返回 `200`，并且内容中有 `success` 和 `healthy`。

如果返回 `503`，一般是数据库或 Redis 未连接。先检查 `.env` 中的 `DATABASE_URL`、`REDIS_URL` 是否填写正确，再执行：

```bash
tail -n 100 /tmp/medspa-worker.log
ps aux | grep -E "next start|workers/start" | grep -v grep
```

把输出截图给开发人员即可，截图前请遮住所有密钥和完整连接地址。

## 第 7 步：做一次完整业务验收

请只用已经取得授权、且最好已脱敏的测试录音。

1. 用机构管理员账号登录网站。
2. 新建一个测试客户，分配给测试咨询师。
3. 以咨询师账号上传一条 1 到 3 分钟 MP3。
4. 观察状态是否依次经过：`待处理`、`转写中`、`分析中`、`完成`。
5. 打开客户详情，确认有转写内容、客户标签、跟进计划和待办任务。
6. 打开“每日工作台”，生成一次跟进话术。
7. 确认话术没有直接承诺治疗效果、绝对化宣传或不合规医疗表述。
8. 测试两个不同机构账号，确认 A 机构看不到 B 机构客户和录音。

只要其中任一步失败，记录页面地址、操作步骤、时间和报错截图，不要重复上传包含真实客户信息的录音。

## 第 8 步：日常操作规则

1. 每次发版前先在 GitHub 确认代码已经更新，再运行 `bash deploy.sh`。
2. 每周检查一次磁盘空间、数据库备份和 OSS 用量。
3. 每月轮换一次云密钥，或在人员离职、设备丢失、密钥泄露时立即轮换。
4. 录音、转写和客户信息属于敏感业务数据；只给需要的人授权，账号离职立即停用。
5. 不要将生产数据库导出文件、`.env`、真实客户录音放到 GitHub、微信群或聊天窗口。

## 常见问题速查

| 现象 | 先做什么 |
| --- | --- |
| 网站打不开 | 执行健康检查命令，确认反向代理是否转到 `/medspa`。 |
| 上传后一直“待处理” | 查看 `/tmp/medspa-worker.log`，通常是 Worker 或 Redis 没启动。 |
| 显示“转写失败” | 检查腾讯云密钥、ASR 服务开通状态、OSS 短期链接是否可访问。 |
| 显示“分析失败” | 检查 DeepSeek Key 是否有额度和网络是否可访问。 |
| 数据库迁移失败 | 停止发布，不要使用 `db push` 或删除表；保存报错交给开发人员。 |
| 看到了别的机构数据 | 立即停止使用，记录账号和页面，通知开发人员排查租户隔离。 |

## 你完成后，只需要反馈这四项

不要发任何密钥。只发下面内容的截图或文字即可：

1. `curl -i http://127.0.0.1:3010/medspa/api/health` 的结果。
2. `bash deploy.sh` 最后 30 行输出。
3. 测试录音从上传到完成的页面截图。
4. 如果失败，`tail -n 100 /tmp/medspa-worker.log` 的脱敏截图。
