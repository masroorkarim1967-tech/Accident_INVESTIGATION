-- CreateEnum
CREATE TYPE "WitnessType" AS ENUM ('Crew', 'Passenger', 'ATC', 'GroundObserver', 'Other');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('Photographs', 'Documents', 'Statements', 'CCTVReference', 'FlightRecords', 'MaintenanceRecords', 'GroundHandlingRecords', 'TrainingRecords', 'Emails', 'Other');

-- CreateEnum
CREATE TYPE "AssessmentLevel" AS ENUM ('High', 'Medium', 'Low');

-- CreateTable
CREATE TABLE "Witness" (
    "id" SERIAL NOT NULL,
    "investigationId" INTEGER NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "contactInfo" VARCHAR(200),
    "witnessType" "WitnessType" NOT NULL,
    "statementSummary" TEXT NOT NULL,
    "statementDate" DATE,
    "reliabilityAssessment" "AssessmentLevel" NOT NULL,
    "reliabilityNotes" TEXT,

    CONSTRAINT "Witness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" SERIAL NOT NULL,
    "investigationId" INTEGER NOT NULL,
    "evidenceType" "EvidenceType" NOT NULL,
    "description" TEXT NOT NULL,
    "source" VARCHAR(200) NOT NULL,
    "collectedBy" VARCHAR(150),
    "dateObtained" DATE,
    "relevance" "AssessmentLevel" NOT NULL,
    "reliabilityAssessment" "AssessmentLevel" NOT NULL,
    "reliabilityNotes" TEXT,
    "investigatorNotes" TEXT,
    "custodyNotes" TEXT,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" SERIAL NOT NULL,
    "evidenceId" INTEGER NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "storagePath" VARCHAR(500) NOT NULL,
    "fileBytes" BYTEA NOT NULL,
    "isSimulated" BOOLEAN NOT NULL DEFAULT false,
    "uploadedByUserId" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Witness_investigationId_idx" ON "Witness"("investigationId");

-- CreateIndex
CREATE INDEX "Evidence_investigationId_idx" ON "Evidence"("investigationId");

-- CreateIndex
CREATE INDEX "Evidence_evidenceType_idx" ON "Evidence"("evidenceType");

-- CreateIndex
CREATE INDEX "Evidence_relevance_idx" ON "Evidence"("relevance");

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_storagePath_key" ON "Attachment"("storagePath");

-- CreateIndex
CREATE INDEX "Attachment_evidenceId_idx" ON "Attachment"("evidenceId");

-- AddForeignKey
ALTER TABLE "Witness" ADD CONSTRAINT "Witness_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
