# iOS App Store 发布 SOP

本文只覆盖当前“咨询师 App”版本。它具备任务、本人客户、取得同意后的实时转写、审核话术建议、隐私入口和账号删除申请；它**不具备**后台持续录音、离线音频加密缓存、断点续传或推送通知。不要在 App Store 描述中宣称这些尚未实现的能力。

## 0. 发布门槛

下列条件必须全部满足，否则不要归档或提交审核：

1. 有 Apple Developer Program 的**组织账号**。该产品处理医美咨询数据和录音，应由实际提供服务的法人主体提交，不应使用个人开发者账号。
2. 有可公开访问的 HTTPS 域名，例如 `https://app.example.com/medspa`。不得填写服务器 IP、HTTP 地址、内网地址或临时隧道地址。
3. 域名下的 `https://app.example.com/medspa/privacy` 可以在未登录状态打开。
4. 腾讯云实时 ASR 的 `TENCENT_ASR_APP_ID` 已配置，且用脱敏测试录音完成真实转写验证。
5. 已经由机构法务确认录音告知文本、数据保留期限、客户撤回流程和账号删除处理人。
6. 已准备独立的 App Store 审核测试账号，且账号仅包含脱敏测试数据。

## 1. 首次配置

在 Mac 上安装最新版 Xcode，并登录负责发布的组织 Apple ID。然后在项目目录执行：

```bash
pnpm install --frozen-lockfile
export CAPACITOR_SERVER_URL="https://app.example.com/medspa"
pnpm ios:sync:release
pnpm cap:open:ios
```

在 Xcode 中打开 `ios/App/App.xcodeproj` 后：

1. 选择 `App` target 的 `Signing & Capabilities`，启用 `Automatically manage signing`。
2. 将 Bundle Identifier 从 `com.medspacopilot.consultant` 改成 Apple Developer 后台已经注册且唯一的标识，例如 `com.你的公司.medspacopilot`。
3. 将 `Team` 选为实际发布的组织团队。
4. 检查 `Info.plist` 包含中文的麦克风说明，且没有不使用的相机、通讯录、定位或相册权限。
5. 在 `Build Settings` 中确认最低系统版本为 iOS 15.0，不要在未做兼容性测试时上调或下调。
6. 使用真机运行。只有确认登录、任务、同意、麦克风、实时转写、停止转写、进入后台和退出登录均正常，才进行 Archive。

## 2. 上架前自动验证

在 Windows 或 Mac 都先执行：

```bash
pnpm typecheck
pnpm test:core
pnpm db:validate
pnpm build
pnpm exec cap doctor
```

在 Mac 额外执行：

```bash
export CAPACITOR_SERVER_URL="https://app.example.com/medspa"
pnpm ios:sync:release
```

`ios:sync:release` 会拒绝 HTTP、IP 地址和不指向 `/medspa` 的地址。不得绕过这个检查。

## 3. 真机验收

使用真机完成 [CONSULTANT_APP_ACCEPTANCE.md](./CONSULTANT_APP_ACCEPTANCE.md) 的 `M-01` 至 `M-12`，并额外完成：

1. 开启实时转写后按 Home 键或锁屏：麦克风系统指示应关闭，返回 App 后必须手动重新开启。
2. 在“我的与隐私”中提交账号删除申请：只生成一条申请，重复点击不会产生重复工单；申请会写入审计日志。
3. 从“我的与隐私”打开隐私政策：未登录也能访问；内容包含录音、第三方处理、保留、撤回、删除申请和联系渠道。
4. 使用无效或过期登录态启动 App：回到登录页，不能显示上一个咨询师的数据。
5. 拒绝麦克风权限：页面必须允许手动记录，不得循环弹系统权限框。
6. 断开网络再打开 App：必须明确显示加载/失败状态，不得把未同步动作显示为已完成。
7. 用非咨询师账号打开 `/mobile`：不得读取或写入移动咨询接口数据。

把每项的设备型号、iOS 版本、执行人、结果和截图记录到发布工单。真实客户信息、录音和密钥不得放进截图或审核备注。

## 4. App Store Connect 填写清单

1. App 名称不超过 30 个字符；副标题不超过 30 个字符。描述只写已验收功能，例如“咨询师任务、授权后的现场转写、机构审核话术辅助”。
2. 上传 1024 x 1024 的 App 图标；使用真机截图，不要使用包含客户隐私或模拟系统状态的宣传图。
3. 填写隐私政策 URL：`https://你的域名/medspa/privacy`。
4. 填写 App Privacy。当前实现至少需要如实披露：账号信息、客户资料、自由文本、音频数据、用户 ID、设备 ID（设备会话启用后）和产品交互数据（建议展示/复制状态，如启用）。说明这些数据与用户关联，仅用于 App 功能、业务运营和安全审计；不用于追踪。
5. 在 Review Notes 中说明：此 App 面向已授权的医美机构咨询师；录音与实时转写必须经客户同意；请使用提供的测试账号；AI 建议仅作咨询辅助，不构成医疗建议。
6. 提供可用的审核账号、密码、登录步骤以及演示客户。如果后台功能依赖机构预置话术或 ASR，请在审核备注说明如何验证。
7. 在 Age Rating、内容权利、出口合规和公司信息中如实填写。涉及医疗、隐私和当地广告规则的内容，由法人/法务最终确认。

## 5. 归档与 TestFlight

1. Xcode 选择 `Any iOS Device (arm64)`，执行 `Product > Archive`。
2. 在 Organizer 中先执行 `Validate App`，修正签名、图标、隐私清单或警告后重新归档。
3. 通过后上传至 App Store Connect，先进入 TestFlight。
4. 内部测试通过后，再邀请 5 至 10 名试点咨询师进行外部 TestFlight。只使用脱敏客户数据。
5. 收集崩溃、麦克风权限、ASR 延迟、弱网失败和话术不适用反馈；任何 P0 数据越权、录音未授权或敏感信息泄漏都必须阻断发布。
6. TestFlight 验收完成后，创建正式版本并提交审核。

## 6. 当前不能由代码代办的事项

1. Apple Developer 组织账号、D-U-N-S/法人验证、证书、签名和 App Store Connect 提交。
2. HTTPS 域名、反向代理、有效证书、公开隐私联系邮箱以及可访问的隐私政策地址。
3. 腾讯云 `AppID` 配置和真实环境 ASR/费用/并发 POC。
4. 机构法务对录音、AI 处理、医疗广告、数据保留和删除申请流程的批准。
5. Mac/Xcode 上的真机和 Archive 验证。当前开发机是 Windows，不能伪造 iOS 编译或签名结果。

## 7. 发布否决条件

出现以下任一情况，停止提交：

1. 通过 HTTP 或 IP 地址加载业务页面。
2. 审核账号不可用，或无法演示核心功能。
3. 未配置客户同意、隐私政策 URL 或账号删除申请处理人。
4. 任何接口能跨机构或跨咨询师读取客户、会话、转写或建议。
5. 页面、网络请求、日志、截图或审核材料中出现云密钥、完整录音 URL、真实客户隐私。
6. 仍将未实现的后台录音、离线续传、推送或自动说话人识别宣传为已上线。
