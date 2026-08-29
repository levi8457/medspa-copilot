import assert from "node:assert/strict"
import test from "node:test"
import { consultantCustomerWhere, rankScriptForTrigger } from "./consultation"

const consultantSession = {
  user: { id: "consultant-1", orgId: "org-1", role: "consultant" },
} as never

test("mobile consultation customer lookup is always tenant and consultant scoped", () => {
  assert.deepEqual(consultantCustomerWhere(consultantSession, "customer-1"), {
    id: "customer-1",
    orgId: "org-1",
    consultantId: "consultant-1",
  })
})

test("organization scripts only rank when their content matches the customer trigger", () => {
  const matched = rankScriptForTrigger({
    title: "恢复期顾虑回应",
    content: "我们可以结合您的工作安排，说明恢复节奏和注意事项。",
    category: "异议处理",
    tags: JSON.stringify(["恢复期", "上班"]),
    useCount: 12,
  }, "我担心恢复期影响上班")
  const unmatched = rankScriptForTrigger({
    title: "开场介绍",
    content: "欢迎来到本机构。",
    category: "开场白",
    tags: JSON.stringify(["初诊"]),
    useCount: 999,
  }, "我担心恢复期影响上班")

  assert.ok(matched > 0)
  assert.equal(unmatched, 0)
})
