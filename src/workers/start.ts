// Worker 启动脚本
// 使用方式: pnpm worker

import { Worker } from "bullmq"
import { connection } from "../lib/queue"
import { processAudioJob } from "../workers/audio-processor"

console.log("[Worker] Starting audio processing worker...")

interface AudioProcessingJob {
  recordingId: string
  orgId: string
  customerId: string
  consultantId: string
  ossUrl: string
}

const worker = new Worker(
  "audio-processing",
  async (job) => {
    console.log(`[Worker] Processing job ${job.id} for recording ${job.data.recordingId}`)
    await processAudioJob(job.data as AudioProcessingJob)
  },
  { connection, concurrency: 2 }
)

worker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} completed`)
})

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err)
})

worker.on("ready", () => {
  console.log("[Worker] Audio processing worker is ready and listening for jobs")
})

// 优雅关闭
process.on("SIGINT", async () => {
  console.log("[Worker] Shutting down...")
  await worker.close()
  process.exit(0)
})

process.on("SIGTERM", async () => {
  console.log("[Worker] Shutting down...")
  await worker.close()
  process.exit(0)
})
