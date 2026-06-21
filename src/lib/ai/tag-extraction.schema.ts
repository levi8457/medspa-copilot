import { z } from "zod"

const Confidence = z.enum(["high", "medium", "low"])
const Speaker = z.enum(["customer", "consultant"])

const Evidence = z.object({
  field: z.string(),
  evidence: z.string().min(1),
  speaker: Speaker,
  confidence: Confidence,
})

const BasicInfo = z.object({
  age_range: z.enum(["18-25", "26-30", "31-35", "36-40", "41-50", "50+"]).nullable(),
  gender: z.enum(["female", "male"]).nullable(),
  occupation: z.string().nullable(),
  location: z.string().nullable(),
  evidences: z.array(Evidence).default([]),
})

const SpendingPower = z.object({
  budget_range: z.enum(["5千以下", "5千-1万", "1万-3万", "3万-5万", "5万-10万", "10万以上"]).nullable(),
  price_sensitivity: z.enum(["high", "medium", "low"]).nullable(),
  payment_signal: z.string().nullable(),
  evidences: z.array(Evidence).default([]),
})

const DemandIntentItem = z.object({
  project: z.string().min(1),
  urgency: z.enum(["high", "medium", "low"]),
  decision_stage: z.enum(["awareness", "comparison", "decision", "objection"]),
  evidence: z.string().min(1),
  speaker: Speaker,
  confidence: Confidence,
})

const ConcernItem = z.object({
  type: z.enum(["pain", "recovery", "price", "effect", "safety", "privacy", "family", "other"]),
  detail: z.string().min(1),
  evidence: z.string().min(1),
  speaker: Speaker,
  confidence: Confidence,
})

const Personality = z.object({
  decision_style: z.enum(["decisive", "hesitant", "research-driven", "follower"]).nullable(),
  communication_preference: z.enum(["direct", "detail-oriented", "emotional"]).nullable(),
  evidences: z.array(Evidence).default([]),
})

const RepurchasePotential = z.object({
  lifecycle_stage: z.enum(["new", "considering", "active", "dormant"]).nullable(),
  related_projects: z.array(z.object({
    project: z.string().min(1),
    reason: z.string().min(1),
  })).max(3).default([]),
})

export const TagExtractionResultSchema = z.object({
  summary: z.string().min(1),
  basic_info: BasicInfo,
  spending_power: SpendingPower,
  demand_intent: z.array(DemandIntentItem).default([]),
  concerns: z.array(ConcernItem).default([]),
  personality: Personality,
  repurchase_potential: RepurchasePotential,
})

export type TagExtractionResult = z.infer<typeof TagExtractionResultSchema>

export function parseTagExtractionResult(raw: string): { success: true; data: TagExtractionResult } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(raw)
    const result = TagExtractionResultSchema.safeParse(parsed)
    if (result.success) {
      return { success: true, data: result.data }
    }
    return { success: false, error: result.error.message }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Invalid JSON" }
  }
}
