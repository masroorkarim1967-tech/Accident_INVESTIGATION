-- CreateEnum
CREATE TYPE "ActionPriority" AS ENUM ('Low', 'Medium', 'High', 'Critical');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('Open', 'Assigned', 'InProgress', 'Completed', 'Verified', 'Cancelled');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('FollowUpInspection', 'DataReview', 'Audit', 'Retest', 'StakeholderInterview', 'Other');

-- CreateEnum
CREATE TYPE "EffectivenessResult" AS ENUM ('Effective', 'PartiallyEffective', 'NotEffective', 'TooEarlyToAssess');

-- CreateTable
CREATE TABLE "CorrectiveAction" (
    "id" SERIAL NOT NULL,
    "investigationId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "ActionPriority" NOT NULL,
    "status" "ActionStatus" NOT NULL DEFAULT 'Open',
    "targetDate" DATE NOT NULL,
    "completedDate" DATE,
    "verificationMethod" "VerificationMethod",
    "verificationNotes" TEXT,
    "effectivenessResult" "EffectivenessResult",
    "investigatorComments" TEXT,
    "ownerUserId" INTEGER,
    "ownerExternalName" VARCHAR(150),
    "department" VARCHAR(100),
    "rootCauseId" INTEGER,
    "hazardId" INTEGER,
    "requiredForClosure" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CorrectiveAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreventiveAction" (
    "id" SERIAL NOT NULL,
    "investigationId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "ActionPriority" NOT NULL,
    "status" "ActionStatus" NOT NULL DEFAULT 'Open',
    "targetDate" DATE NOT NULL,
    "completedDate" DATE,
    "verificationMethod" "VerificationMethod",
    "verificationNotes" TEXT,
    "effectivenessResult" "EffectivenessResult",
    "investigatorComments" TEXT,
    "ownerUserId" INTEGER,
    "ownerExternalName" VARCHAR(150),
    "department" VARCHAR(100),
    "hazardId" INTEGER,
    "rootCauseId" INTEGER,
    "requiredForClosure" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PreventiveAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CorrectiveAction_investigationId_idx" ON "CorrectiveAction"("investigationId");

-- CreateIndex
CREATE INDEX "CorrectiveAction_status_idx" ON "CorrectiveAction"("status");

-- CreateIndex
CREATE INDEX "CorrectiveAction_targetDate_idx" ON "CorrectiveAction"("targetDate");

-- CreateIndex
CREATE INDEX "CorrectiveAction_ownerUserId_idx" ON "CorrectiveAction"("ownerUserId");

-- CreateIndex
CREATE INDEX "CorrectiveAction_requiredForClosure_status_idx" ON "CorrectiveAction"("requiredForClosure", "status");

-- CreateIndex
CREATE INDEX "PreventiveAction_investigationId_idx" ON "PreventiveAction"("investigationId");

-- CreateIndex
CREATE INDEX "PreventiveAction_status_idx" ON "PreventiveAction"("status");

-- CreateIndex
CREATE INDEX "PreventiveAction_targetDate_idx" ON "PreventiveAction"("targetDate");

-- CreateIndex
CREATE INDEX "PreventiveAction_ownerUserId_idx" ON "PreventiveAction"("ownerUserId");

-- CreateIndex
CREATE INDEX "PreventiveAction_requiredForClosure_status_idx" ON "PreventiveAction"("requiredForClosure", "status");

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_rootCauseId_fkey" FOREIGN KEY ("rootCauseId") REFERENCES "RootCause"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_hazardId_fkey" FOREIGN KEY ("hazardId") REFERENCES "Hazard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreventiveAction" ADD CONSTRAINT "PreventiveAction_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreventiveAction" ADD CONSTRAINT "PreventiveAction_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreventiveAction" ADD CONSTRAINT "PreventiveAction_hazardId_fkey" FOREIGN KEY ("hazardId") REFERENCES "Hazard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreventiveAction" ADD CONSTRAINT "PreventiveAction_rootCauseId_fkey" FOREIGN KEY ("rootCauseId") REFERENCES "RootCause"("id") ON DELETE SET NULL ON UPDATE CASCADE;
