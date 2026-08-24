-- This migration upgrades the existing production baseline without rewriting
-- customer data or historical follow-up plans.

-- DropIndex
DROP INDEX "customer_tags_customerId_dimension_key";

-- AlterTable
ALTER TABLE "follow_up_plans" ADD COLUMN "sourceAudioRecordId" TEXT;

-- CreateTable
CREATE TABLE "script_generations" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "inputSnapshot" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "subjectLine" TEXT,
    "keyPoints" TEXT,
    "complianceResult" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'deepseek-chat',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "script_generations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "script_generations_orgId_idx" ON "script_generations"("orgId");

-- CreateIndex
CREATE INDEX "script_generations_taskId_idx" ON "script_generations"("taskId");

-- CreateIndex
CREATE INDEX "script_generations_customerId_idx" ON "script_generations"("customerId");

-- CreateIndex
CREATE INDEX "script_generations_consultantId_idx" ON "script_generations"("consultantId");

-- CreateIndex
CREATE INDEX "script_generations_createdAt_idx" ON "script_generations"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "customer_tags_customerId_dimension_value_key" ON "customer_tags"("customerId", "dimension", "value");

-- CreateIndex
CREATE UNIQUE INDEX "follow_up_plans_sourceAudioRecordId_key" ON "follow_up_plans"("sourceAudioRecordId");

-- AddForeignKey
ALTER TABLE "script_generations" ADD CONSTRAINT "script_generations_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "script_generations" ADD CONSTRAINT "script_generations_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "follow_up_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
