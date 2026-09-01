-- CreateEnum
CREATE TYPE "HazardCategory" AS ENUM ('HumanFactors', 'Technical', 'Environmental', 'Organizational', 'Other');

-- CreateTable
CREATE TABLE "Hazard" (
    "id" SERIAL NOT NULL,
    "investigationId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "hazardCategory" "HazardCategory" NOT NULL,
    "initialLikelihood" "RiskLikelihood" NOT NULL,
    "initialSeverity" "RiskSeverity" NOT NULL,
    "initialRiskScore" INTEGER NOT NULL,
    "initialRiskBand" VARCHAR(20) NOT NULL,
    "existingControls" TEXT,
    "residualLikelihood" "RiskLikelihood",
    "residualSeverity" "RiskSeverity",
    "residualRiskScore" INTEGER,
    "residualRiskBand" VARCHAR(20),

    CONSTRAINT "Hazard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Hazard_investigationId_idx" ON "Hazard"("investigationId");

-- CreateIndex
CREATE INDEX "Hazard_initialRiskBand_idx" ON "Hazard"("initialRiskBand");

-- CreateIndex
CREATE INDEX "Hazard_residualRiskBand_idx" ON "Hazard"("residualRiskBand");

-- AddForeignKey
ALTER TABLE "Hazard" ADD CONSTRAINT "Hazard_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
