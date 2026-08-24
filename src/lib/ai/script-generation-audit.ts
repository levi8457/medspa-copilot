import type { ComplianceResult } from "@/lib/ai/compliance-check"
import type { ScriptResult } from "@/lib/ai/generate-script"
import { prisma } from "@/lib/db"

interface RecordScriptGenerationInput {
  orgId: string
  taskId: string
  customerId: string
  consultantId: string
  inputSnapshot: Record<string, unknown>
  result: ScriptResult
  compliance: ComplianceResult
}

export async function recordScriptGeneration(input: RecordScriptGenerationInput): Promise<void> {
  await prisma.scriptGeneration.create({
    data: {
      orgId: input.orgId,
      taskId: input.taskId,
      customerId: input.customerId,
      consultantId: input.consultantId,
      inputSnapshot: JSON.stringify(input.inputSnapshot),
      output: input.result.script,
      subjectLine: input.result.subject_line,
      keyPoints: JSON.stringify(input.result.key_points),
      complianceResult: JSON.stringify(input.compliance),
    },
  })
}
