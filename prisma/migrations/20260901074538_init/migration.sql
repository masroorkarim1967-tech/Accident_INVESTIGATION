-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('Administrator', 'InvestigationManager', 'Investigator', 'Reviewer', 'Viewer');

-- CreateEnum
CREATE TYPE "InvestigationStatus" AS ENUM ('Draft', 'Open', 'UnderInvestigation', 'Analysis', 'Review', 'Closed');

-- CreateEnum
CREATE TYPE "HistoryEventType" AS ENUM ('Created', 'InvestigatorAssigned', 'InvestigatorReassigned', 'StageAdvanced', 'SubmittedForReview', 'ReviewApproved', 'ReviewChangesRequested', 'Reopened', 'Closed', 'DraftDeleted');

-- CreateEnum
CREATE TYPE "LoginAttemptType" AS ENUM ('Login', 'Upload');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investigation" (
    "id" SERIAL NOT NULL,
    "referenceNumber" VARCHAR(20) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "status" "InvestigationStatus" NOT NULL DEFAULT 'Draft',
    "reporterName" VARCHAR(150) NOT NULL,
    "createdByUserId" INTEGER NOT NULL,
    "assignedInvestigatorUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "reopenReason" TEXT,

    CONSTRAINT "Investigation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Occurrence" (
    "investigationId" INTEGER NOT NULL,
    "occurrenceDateUtc" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Occurrence_pkey" PRIMARY KEY ("investigationId")
);

-- CreateTable
CREATE TABLE "ReferenceNumberSequence" (
    "year" INTEGER NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ReferenceNumberSequence_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "InvestigationHistory" (
    "id" SERIAL NOT NULL,
    "investigationId" INTEGER NOT NULL,
    "eventType" "HistoryEventType" NOT NULL,
    "fromStatus" "InvestigationStatus",
    "toStatus" "InvestigationStatus",
    "performedByUserId" INTEGER NOT NULL,
    "reasonText" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestigationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" SERIAL NOT NULL,
    "identifier" VARCHAR(254) NOT NULL,
    "ipAddress" VARCHAR(45),
    "attemptType" "LoginAttemptType" NOT NULL,
    "succeeded" BOOLEAN NOT NULL,
    "userId" INTEGER,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Investigation_referenceNumber_key" ON "Investigation"("referenceNumber");

-- CreateIndex
CREATE INDEX "Investigation_status_idx" ON "Investigation"("status");

-- CreateIndex
CREATE INDEX "Investigation_assignedInvestigatorUserId_idx" ON "Investigation"("assignedInvestigatorUserId");

-- CreateIndex
CREATE INDEX "Investigation_createdByUserId_idx" ON "Investigation"("createdByUserId");

-- CreateIndex
CREATE INDEX "InvestigationHistory_investigationId_occurredAt_idx" ON "InvestigationHistory"("investigationId", "occurredAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_identifier_attemptedAt_idx" ON "LoginAttempt"("identifier", "attemptedAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_ipAddress_attemptedAt_idx" ON "LoginAttempt"("ipAddress", "attemptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "Investigation" ADD CONSTRAINT "Investigation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investigation" ADD CONSTRAINT "Investigation_assignedInvestigatorUserId_fkey" FOREIGN KEY ("assignedInvestigatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Occurrence" ADD CONSTRAINT "Occurrence_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationHistory" ADD CONSTRAINT "InvestigationHistory_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationHistory" ADD CONSTRAINT "InvestigationHistory_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginAttempt" ADD CONSTRAINT "LoginAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
