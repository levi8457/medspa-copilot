-- Mobile consultant P0: consented on-site sessions and auditable assistance.

-- AlterTable
ALTER TABLE "script_library" ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'approved';

-- CreateTable
CREATE TABLE "consultation_sessions" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "consentVersion" TEXT,
    "consentRecordedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recording_consents" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "consultationSessionId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recording_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "realtime_transcript_segments" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "consultationSessionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'confirmed',
    "speakerGroup" TEXT,
    "startedAtMs" INTEGER,
    "endedAtMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "realtime_transcript_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "realtime_suggestions" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "consultationSessionId" TEXT NOT NULL,
    "triggerText" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "content" TEXT NOT NULL,
    "complianceResult" TEXT NOT NULL,
    "displayState" TEXT NOT NULL DEFAULT 'shown',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "realtime_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_sessions" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "pushToken" TEXT,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "script_library_approvalStatus_idx" ON "script_library"("approvalStatus");
CREATE INDEX "consultation_sessions_orgId_idx" ON "consultation_sessions"("orgId");
CREATE INDEX "consultation_sessions_customerId_idx" ON "consultation_sessions"("customerId");
CREATE INDEX "consultation_sessions_consultantId_idx" ON "consultation_sessions"("consultantId");
CREATE INDEX "consultation_sessions_status_idx" ON "consultation_sessions"("status");
CREATE INDEX "recording_consents_orgId_idx" ON "recording_consents"("orgId");
CREATE INDEX "recording_consents_customerId_idx" ON "recording_consents"("customerId");
CREATE INDEX "recording_consents_consultationSessionId_idx" ON "recording_consents"("consultationSessionId");
CREATE INDEX "recording_consents_recordedById_idx" ON "recording_consents"("recordedById");
CREATE UNIQUE INDEX "realtime_transcript_segments_consultationSessionId_sequence_key" ON "realtime_transcript_segments"("consultationSessionId", "sequence");
CREATE INDEX "realtime_transcript_segments_orgId_idx" ON "realtime_transcript_segments"("orgId");
CREATE INDEX "realtime_transcript_segments_consultationSessionId_idx" ON "realtime_transcript_segments"("consultationSessionId");
CREATE INDEX "realtime_suggestions_orgId_idx" ON "realtime_suggestions"("orgId");
CREATE INDEX "realtime_suggestions_consultationSessionId_idx" ON "realtime_suggestions"("consultationSessionId");
CREATE INDEX "realtime_suggestions_sourceType_idx" ON "realtime_suggestions"("sourceType");
CREATE UNIQUE INDEX "device_sessions_userId_deviceId_key" ON "device_sessions"("userId", "deviceId");
CREATE INDEX "device_sessions_orgId_idx" ON "device_sessions"("orgId");
CREATE INDEX "device_sessions_userId_idx" ON "device_sessions"("userId");
CREATE INDEX "device_sessions_isRevoked_idx" ON "device_sessions"("isRevoked");

-- AddForeignKey
ALTER TABLE "consultation_sessions" ADD CONSTRAINT "consultation_sessions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "consultation_sessions" ADD CONSTRAINT "consultation_sessions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "consultation_sessions" ADD CONSTRAINT "consultation_sessions_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recording_consents" ADD CONSTRAINT "recording_consents_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recording_consents" ADD CONSTRAINT "recording_consents_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recording_consents" ADD CONSTRAINT "recording_consents_consultationSessionId_fkey" FOREIGN KEY ("consultationSessionId") REFERENCES "consultation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recording_consents" ADD CONSTRAINT "recording_consents_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "realtime_transcript_segments" ADD CONSTRAINT "realtime_transcript_segments_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "realtime_transcript_segments" ADD CONSTRAINT "realtime_transcript_segments_consultationSessionId_fkey" FOREIGN KEY ("consultationSessionId") REFERENCES "consultation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "realtime_suggestions" ADD CONSTRAINT "realtime_suggestions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "realtime_suggestions" ADD CONSTRAINT "realtime_suggestions_consultationSessionId_fkey" FOREIGN KEY ("consultationSessionId") REFERENCES "consultation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
