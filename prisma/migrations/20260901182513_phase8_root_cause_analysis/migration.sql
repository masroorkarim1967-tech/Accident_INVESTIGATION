-- CreateEnum
CREATE TYPE "FactorCategory" AS ENUM ('HumanFactors', 'Equipment', 'Environment', 'Procedures', 'Training', 'Supervision', 'Communication', 'Organization', 'Management', 'ExternalFactors');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('Low', 'Medium', 'High');

-- CreateTable
CREATE TABLE "ContributingFactor" (
    "id" SERIAL NOT NULL,
    "investigationId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "category" "FactorCategory" NOT NULL,

    CONSTRAINT "ContributingFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContributingFactorHazardLink" (
    "contributingFactorId" INTEGER NOT NULL,
    "hazardId" INTEGER NOT NULL,

    CONSTRAINT "ContributingFactorHazardLink_pkey" PRIMARY KEY ("contributingFactorId","hazardId")
);

-- CreateTable
CREATE TABLE "FiveWhysAnalysis" (
    "id" SERIAL NOT NULL,
    "investigationId" INTEGER NOT NULL,
    "problemStatement" TEXT NOT NULL,
    "createdByUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FiveWhysAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiveWhysEntry" (
    "id" SERIAL NOT NULL,
    "fiveWhysAnalysisId" INTEGER NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,

    CONSTRAINT "FiveWhysEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RootCause" (
    "id" SERIAL NOT NULL,
    "investigationId" INTEGER NOT NULL,
    "description" TEXT,
    "category" "FactorCategory",
    "fiveWhysAnalysisId" INTEGER,
    "supportingEvidence" TEXT,
    "investigatorNotes" TEXT,
    "confidenceLevel" "ConfidenceLevel",
    "isInconclusive" BOOLEAN NOT NULL DEFAULT false,
    "inconclusiveJustification" TEXT,

    CONSTRAINT "RootCause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RootCauseContributingFactorLink" (
    "rootCauseId" INTEGER NOT NULL,
    "contributingFactorId" INTEGER NOT NULL,

    CONSTRAINT "RootCauseContributingFactorLink_pkey" PRIMARY KEY ("rootCauseId","contributingFactorId")
);

-- CreateIndex
CREATE INDEX "ContributingFactor_investigationId_idx" ON "ContributingFactor"("investigationId");

-- CreateIndex
CREATE INDEX "FiveWhysAnalysis_investigationId_idx" ON "FiveWhysAnalysis"("investigationId");

-- CreateIndex
CREATE INDEX "FiveWhysEntry_fiveWhysAnalysisId_idx" ON "FiveWhysEntry"("fiveWhysAnalysisId");

-- CreateIndex
CREATE UNIQUE INDEX "FiveWhysEntry_fiveWhysAnalysisId_sequenceNumber_key" ON "FiveWhysEntry"("fiveWhysAnalysisId", "sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RootCause_fiveWhysAnalysisId_key" ON "RootCause"("fiveWhysAnalysisId");

-- CreateIndex
CREATE INDEX "RootCause_investigationId_idx" ON "RootCause"("investigationId");

-- AddForeignKey
ALTER TABLE "ContributingFactor" ADD CONSTRAINT "ContributingFactor_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContributingFactorHazardLink" ADD CONSTRAINT "ContributingFactorHazardLink_contributingFactorId_fkey" FOREIGN KEY ("contributingFactorId") REFERENCES "ContributingFactor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContributingFactorHazardLink" ADD CONSTRAINT "ContributingFactorHazardLink_hazardId_fkey" FOREIGN KEY ("hazardId") REFERENCES "Hazard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiveWhysAnalysis" ADD CONSTRAINT "FiveWhysAnalysis_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiveWhysAnalysis" ADD CONSTRAINT "FiveWhysAnalysis_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiveWhysEntry" ADD CONSTRAINT "FiveWhysEntry_fiveWhysAnalysisId_fkey" FOREIGN KEY ("fiveWhysAnalysisId") REFERENCES "FiveWhysAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RootCause" ADD CONSTRAINT "RootCause_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RootCause" ADD CONSTRAINT "RootCause_fiveWhysAnalysisId_fkey" FOREIGN KEY ("fiveWhysAnalysisId") REFERENCES "FiveWhysAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RootCauseContributingFactorLink" ADD CONSTRAINT "RootCauseContributingFactorLink_rootCauseId_fkey" FOREIGN KEY ("rootCauseId") REFERENCES "RootCause"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RootCauseContributingFactorLink" ADD CONSTRAINT "RootCauseContributingFactorLink_contributingFactorId_fkey" FOREIGN KEY ("contributingFactorId") REFERENCES "ContributingFactor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
