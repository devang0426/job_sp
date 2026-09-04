-- Schema for everything after the User table.
--
-- 20260902094313_init and 20260902101138_user_soft_delete create "User".
-- This migration adds the remaining eight models, all enums, their indexes,
-- and every foreign key, including User.activeResumeId -> Resume, which
-- could not exist until Resume did.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "JobSource" AS ENUM ('ADZUNA', 'JSEARCH', 'GREENHOUSE', 'ASHBY', 'LEVER', 'SCRAPED', 'MANUAL');

-- CreateEnum
CREATE TYPE "Seniority" AS ENUM ('INTERN', 'JUNIOR', 'MID', 'SENIOR', 'STAFF', 'LEAD', 'PRINCIPAL');

-- CreateEnum
CREATE TYPE "Recommendation" AS ENUM ('APPLY', 'CONSIDER', 'SKIP');

-- CreateEnum
CREATE TYPE "LegitimacyTier" AS ENUM ('VERIFIED', 'LIKELY_LEGITIMATE', 'UNVERIFIED', 'SUSPICIOUS');

-- CreateEnum
CREATE TYPE "ParseStatus" AS ENUM ('PARSED', 'EMPTY', 'FAILED');

-- CreateEnum
CREATE TYPE "ParseSource" AS ENUM ('PDF_PARSE', 'CLAUDE_DOCUMENT', 'PASTED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETE', 'FAILED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('EVALUATED', 'APPLIED', 'RESPONDED', 'INTERVIEW', 'OFFER', 'REJECTED', 'DISCARDED', 'SKIP', 'HIRED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'NOTE_ADDED', 'ARTIFACT_GENERATED', 'FOLLOW_UP_SENT', 'REEVALUATED');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "ScanTrigger" AS ENUM ('MANUAL', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "ArtifactKind" AS ENUM ('FOLLOW_UP_EMAIL', 'CV_VARIANT');

-- CreateTable
CREATE TABLE "Preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetRoles" TEXT[],
    "locations" TEXT[],
    "remoteOnly" BOOLEAN NOT NULL DEFAULT false,
    "employmentTypes" TEXT[],
    "seniority" "Seniority",
    "minSalary" INTEGER,
    "salaryCurrency" TEXT NOT NULL DEFAULT 'INR',
    "keywords" TEXT[],
    "excludeKeywords" TEXT[],
    "excludedCompanies" TEXT[],
    "sources" "JobSource"[],
    "maxJobsPerScan" INTEGER NOT NULL DEFAULT 40,
    "autoEvaluate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resume" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'CV',
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "pageCount" INTEGER,
    "rawText" TEXT NOT NULL,
    "charCount" INTEGER NOT NULL,
    "structured" JSONB,
    "structuredAt" TIMESTAMP(3),
    "parseStatus" "ParseStatus" NOT NULL DEFAULT 'PARSED',
    "parseSource" "ParseSource" NOT NULL DEFAULT 'PDF_PARSE',
    "parseError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "source" "JobSource" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "companyDomain" TEXT,
    "location" TEXT,
    "countryCode" TEXT,
    "isRemote" BOOLEAN NOT NULL DEFAULT false,
    "employmentType" TEXT,
    "seniority" "Seniority",
    "descriptionText" TEXT NOT NULL,
    "descriptionChars" INTEGER NOT NULL,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryCurrency" TEXT,
    "salaryPeriod" TEXT,
    "applyUrl" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "postedAt" TIMESTAMP(3),
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seenCount" INTEGER NOT NULL DEFAULT 1,
    "raw" JSONB NOT NULL,
    "firstSeenInScanRunId" TEXT,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "triggerRunId" TEXT,
    "failureReason" TEXT,
    "score" INTEGER,
    "recommendation" "Recommendation",
    "modelRecommendation" "Recommendation",
    "dimRoleFit" INTEGER,
    "dimSkillsMatch" INTEGER,
    "dimExperienceDepth" INTEGER,
    "dimDomainContext" INTEGER,
    "dimLogistics" INTEGER,
    "summary" TEXT,
    "strengths" JSONB,
    "gaps" JSONB,
    "cvTips" JSONB,
    "requirements" JSONB,
    "legitimacyTier" "LegitimacyTier",
    "legitimacySignals" JSONB,
    "scoreCapApplied" TEXT,
    "raw" JSONB,
    "model" TEXT,
    "promptVersion" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "cachedTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DECIMAL(10,6),
    "latencyMs" INTEGER,
    "evaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "matchId" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'EVALUATED',
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "boardOrder" INTEGER NOT NULL DEFAULT 0,
    "appliedAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "lastContactAt" TIMESTAMP(3),
    "notes" TEXT,
    "outcomeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "fromStatus" "ApplicationStatus",
    "toStatus" "ApplicationStatus",
    "message" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ArtifactKind" NOT NULL,
    "applicationId" TEXT,
    "jobId" TEXT,
    "matchId" TEXT,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "editedContent" TEXT,
    "editedAt" TIMESTAMP(3),
    "inputs" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "costUsd" DECIMAL(10,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ScanStatus" NOT NULL DEFAULT 'QUEUED',
    "trigger" "ScanTrigger" NOT NULL DEFAULT 'MANUAL',
    "triggerRunId" TEXT,
    "querySnapshot" JSONB NOT NULL,
    "sourcesUsed" "JobSource"[],
    "jobsFound" INTEGER NOT NULL DEFAULT 0,
    "jobsNew" INTEGER NOT NULL DEFAULT 0,
    "jobsUpdated" INTEGER NOT NULL DEFAULT 0,
    "jobsFiltered" INTEGER NOT NULL DEFAULT 0,
    "evaluationsQueued" INTEGER NOT NULL DEFAULT 0,
    "sourceStats" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Preferences_userId_key" ON "Preferences"("userId");

-- CreateIndex
CREATE INDEX "Resume_userId_createdAt_idx" ON "Resume"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Job_dedupeKey_key" ON "Job"("dedupeKey");

-- CreateIndex
CREATE INDEX "Job_postedAt_idx" ON "Job"("postedAt" DESC);

-- CreateIndex
CREATE INDEX "Job_company_idx" ON "Job"("company");

-- CreateIndex
CREATE INDEX "Job_firstSeenInScanRunId_idx" ON "Job"("firstSeenInScanRunId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_source_sourceId_key" ON "Job"("source", "sourceId");

-- CreateIndex
CREATE INDEX "Match_userId_score_idx" ON "Match"("userId", "score" DESC);

-- CreateIndex
CREATE INDEX "Match_userId_recommendation_score_idx" ON "Match"("userId", "recommendation", "score" DESC);

-- CreateIndex
CREATE INDEX "Match_userId_status_idx" ON "Match"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Match_userId_jobId_key" ON "Match"("userId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_matchId_key" ON "Application"("matchId");

-- CreateIndex
CREATE INDEX "Application_userId_status_boardOrder_idx" ON "Application"("userId", "status", "boardOrder");

-- CreateIndex
CREATE INDEX "Application_userId_nextFollowUpAt_idx" ON "Application"("userId", "nextFollowUpAt");

-- CreateIndex
CREATE UNIQUE INDEX "Application_userId_jobId_key" ON "Application"("userId", "jobId");

-- CreateIndex
CREATE INDEX "ApplicationEvent_applicationId_createdAt_idx" ON "ApplicationEvent"("applicationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Artifact_userId_kind_createdAt_idx" ON "Artifact"("userId", "kind", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Artifact_applicationId_idx" ON "Artifact"("applicationId");

-- CreateIndex
CREATE INDEX "ScanRun_userId_createdAt_idx" ON "ScanRun"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_activeResumeId_fkey" FOREIGN KEY ("activeResumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Preferences" ADD CONSTRAINT "Preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_firstSeenInScanRunId_fkey" FOREIGN KEY ("firstSeenInScanRunId") REFERENCES "ScanRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvent" ADD CONSTRAINT "ApplicationEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanRun" ADD CONSTRAINT "ScanRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

