import assert from "node:assert/strict"
import test from "node:test"
import { downsampleToPcm16 } from "./realtime-audio"

test("realtime audio downsampling produces 16 kHz PCM samples", () => {
  const input = new Float32Array(480).fill(0.5)
  const pcm = new Int16Array(downsampleToPcm16(input, 48000))

  assert.equal(pcm.length, 160)
  assert.ok(pcm[0] > 16000)
})
