import assert from "node:assert/strict"
import test from "node:test"
import { formatTranscriptWithSpeakers } from "./index"

test("ASR speaker groups remain unknown until a business role is verified", () => {
  const transcript = formatTranscriptWithSpeakers([
    {
      speaker: "unknown",
      speakerId: "2",
      text: "我想了解水光针",
      startTime: 0,
      endTime: 2,
      confidence: 0.9,
    },
  ])

  assert.equal(transcript, "[unknown:2] 我想了解水光针")
  assert.doesNotMatch(transcript, /\[customer\]|\[consultant\]/)
})
