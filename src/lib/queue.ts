import { Queue } from "bullmq"

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"

export const connection = {
  host: new URL(REDIS_URL).hostname,
  port: parseInt(new URL(REDIS_URL).port || "6379"),
  password: new URL(REDIS_URL).password || undefined,
}

export const audioQueue = new Queue("audio-processing", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
})

export async function addAudioProcessingJob(data: {
  recordingId: string
  orgId: string
  customerId: string
  consultantId: string
  ossUrl: string
}) {
  const job = await audioQueue.add("process-audio", data, {
    jobId: `audio-${data.recordingId}`,
  })
  console.log(`[Queue] Job ${job.id} added for recording ${data.recordingId}`)
  return job
}
