import assert from "node:assert/strict"
import test from "node:test"
import { buildTencentRealtimeSession } from "./realtime"

test("Tencent realtime ASR session uses a short expiry and never exposes SecretKey", () => {
  const session = buildTencentRealtimeSession({
    appId: "1250000000",
    secretId: "AKID-example",
    secretKey: "secret-key-must-not-appear-in-url",
    engineModelType: "16k_zh_en",
    hotwordId: "hotword-1",
  }, 1_700_000_000)

  assert.equal(session.expiresAt, 1_700_000_300)
  assert.match(session.url, /^wss:\/\/asr\.cloud\.tencent\.com\/asr\/v2\/1250000000\?/) 
  assert.match(session.url, /secretid=AKID-example/)
  assert.match(session.url, /hotword_id=hotword-1/)
  assert.doesNotMatch(session.url, /secret-key-must-not-appear-in-url/)
})
