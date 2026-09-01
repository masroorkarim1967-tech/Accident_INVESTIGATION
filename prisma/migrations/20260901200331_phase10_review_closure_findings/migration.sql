-- CreateEnum
CREATE TYPE "FindingType" AS ENUM ('Cause', 'ContributingFactor', 'RiskObservation', 'Other');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('Approved', 'ChangesRequested');

-- AlterTable
ALTER TABLE "InvestigationHistory" ADD COLUMN     "relatedReviewId" INTEGER;

-- CreateTable
CREATE TABLE "InvestigationFinding" (
    "id" SERIAL NOT NULL,
    "investigationId" INTEGER NOT NULL,
    "findingNumber" INTEGER NOT NULL,
    "findingType" "FindingType" NOT NULL,
    "description" TEXT NOT NULL,
    "createdByUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestigationFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FindingHazardLink" (
    "findingId" INTEGER NOT NULL,
    "hazardId" INTEGER NOT NULL,

    CONSTRAINT "FindingHazardLink_pkey" PRIMARY KEY ("findingId","hazardId")
);

-- CreateTable
CREATE TABLE "FindingContributingFactorLink" (
    "findingId" INTEGER NOT NULL,
    "contributingFactorId" INTEGER NOT NULL,

    CONSTRAINT "FindingContributingFactorLink_pkey" PRIMARY KEY ("findingId","contributingFactorId")
);

-- CreateTable
CREATE TABLE "FindingRootCauseLink" (
    "findingId" INTEGER NOT NULL,
    "rootCauseId" INTEGER NOT NULL,

    CONSTRAINT "FindingRootCauseLink_pkey" PRIMARY KEY ("findingId","rootCauseId")
);

-- CreateTable
CREATE TABLE "EvidenceFindingLink" (
    "evidenceId" INTEGER NOT NULL,
    "findingId" INTEGER NOT NULL,

    CONSTRAINT "EvidenceFindingLink_pkey" PRIMARY KEY ("evidenceId","findingId")
);

-- CreateTable
CREATE TABLE "InvestigationReview" (
    "id" SERIAL NOT NULL,
    "investigationId" INTEGER NOT NULL,
    "reviewerUserId" INTEGER NOT NULL,
    "reviewDecision" "ReviewDecision" NOT NULL,
    "comments" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestigationReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvestigationFinding_investigationId_idx" ON "InvestigationFinding"("investigationId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestigationFinding_investigationId_findingNumber_key" ON "InvestigationFinding"("investigationId", "findingNumber");

-- CreateIndex
CREATE INDEX "InvestigationReview_investigationId_idx" ON "InvestigationReview"("investigationId");

-- AddForeignKey
ALTER TABLE "InvestigationFinding" ADD CONSTRAINT "InvestigationFinding_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationFinding" ADD CONSTRAINT "InvestigationFinding_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FindingHazardLink" ADD CONSTRAINT "FindingHazardLink_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "InvestigationFinding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FindingHazardLink" ADD CONSTRAINT "FindingHazardLink_hazardId_fkey" FOREIGN KEY ("hazardId") REFERENCES "Hazard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FindingContributingFactorLink" ADD CONSTRAINT "FindingContributingFactorLink_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "InvestigationFinding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FindingContributingFactorLink" ADD CONSTRAINT "FindingContributingFactorLink_contributingFactorId_fkey" FOREIGN KEY ("contributingFactorId") REFERENCES "ContributingFactor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FindingRootCauseLink" ADD CONSTRAINT "FindingRootCauseLink_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "InvestigationFinding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FindingRootCauseLink" ADD CONSTRAINT "FindingRootCauseLink_rootCauseId_fkey" FOREIGN KEY ("rootCauseId") REFERENCES "RootCause"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceFindingLink" ADD CONSTRAINT "EvidenceFindingLink_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceFindingLink" ADD CONSTRAINT "EvidenceFindingLink_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "InvestigationFinding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationReview" ADD CONSTRAINT "InvestigationReview_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationReview" ADD CONSTRAINT "InvestigationReview_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationHistory" ADD CONSTRAINT "InvestigationHistory_relatedReviewId_fkey" FOREIGN KEY ("relatedReviewId") REFERENCES "InvestigationReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;
