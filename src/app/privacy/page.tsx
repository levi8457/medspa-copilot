import Link from "next/link"

export const metadata = {
  title: "隐私政策 | 医美 AI 智能管家",
  description: "医美 AI 智能管家隐私政策",
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 sm:px-8">
      <Link href="/login" className="text-sm text-[var(--primary)]">返回登录</Link>
      <article className="mt-6 space-y-7 leading-7 text-[var(--foreground-secondary)]">
        <header><p className="font-mono text-xs tracking-[0.2em] text-[var(--primary)]">PRIVACY POLICY</p><h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">医美 AI 智能管家隐私政策</h1><p className="mt-2 text-sm">生效日期：2026-08-30</p></header>
        <section><h2 className="text-xl font-semibold text-[var(--foreground)]">我们处理什么数据</h2><p>为向机构咨询师提供任务、客户服务与现场咨询辅助，我们处理账号信息、机构分配的客户资料、跟进记录、经授权的录音、转写文本和话术建议。录音与实时转写功能仅在咨询师确认客户已知情同意后才可开启。</p></section>
        <section><h2 className="text-xl font-semibold text-[var(--foreground)]">数据如何使用与共享</h2><p>数据仅用于机构授权的客户服务、业务记录、语音转写、合规话术辅助和系统安全审计。为完成这些功能，授权的服务端会与腾讯云语音识别、对象存储及 AI 服务处理必要数据；不会向广告平台出售或用于跨应用追踪。</p></section>
        <section><h2 className="text-xl font-semibold text-[var(--foreground)]">录音、麦克风与撤回</h2><p>应用会在录音或转写期间给出可见状态。咨询师停止转写、结束会话或应用进入后台时会停止麦克风采集。客户不同意时，咨询师仍可使用手动记录，系统不会开启录音、实时转写或实时 AI 提醒。客户撤回同意后的历史数据处理按所属机构的合法数据保留政策执行。</p></section>
        <section><h2 className="text-xl font-semibold text-[var(--foreground)]">保留、访问与删除</h2><p>业务记录由所属机构按其服务协议、法务政策和适用法律保存。咨询师可在 App 的“我的与隐私”页面发起账号删除申请；申请会被记录并由机构管理员处理。出于客户档案、审计或法定义务需要保留的数据，将在合法期限届满后处理。</p></section>
        <section><h2 className="text-xl font-semibold text-[var(--foreground)]">联系我们</h2><p>如需访问、更正、删除个人信息或咨询隐私问题，请联系所属医美机构管理员。正式 App Store 发布前，运营方必须在此处补充可公开访问的隐私联系邮箱和数据控制方名称。</p></section>
      </article>
    </main>
  )
}
