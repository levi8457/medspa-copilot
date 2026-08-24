import assert from "node:assert/strict"
import test from "node:test"
import type { Session } from "next-auth"
import { tenantWhere } from "./db-tenant"

function session(role: "consultant" | "org_admin" | "super_admin"): Session {
  return {
    user: { id: "user-1", orgId: "org-1", role },
    expires: "2099-01-01T00:00:00.000Z",
  } as Session
}

test("consultant customer queries always include organization and owner", () => {
  const where = tenantWhere("Customer", session("consultant"), { status: "lead" })

  assert.deepEqual(where, {
    status: "lead",
    orgId: "org-1",
    consultantId: "user-1",
  })
})

test("organization administrators cannot override the session organization", () => {
  const where = tenantWhere("AudioRecord", session("org_admin"), { orgId: "other-org" })

  assert.equal(where.orgId, "org-1")
})

test("super administrators preserve explicitly supplied filters", () => {
  const where = tenantWhere("Customer", session("super_admin"), { orgId: "other-org" })

  assert.deepEqual(where, { orgId: "other-org" })
})
