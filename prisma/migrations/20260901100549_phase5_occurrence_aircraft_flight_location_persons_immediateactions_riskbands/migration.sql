-- CreateEnum
CREATE TYPE "PhaseOfFlight" AS ENUM ('Standing', 'Taxi', 'Takeoff', 'InitialClimb', 'Climb', 'Cruise', 'Descent', 'Approach', 'Landing', 'GoAround', 'PostLandingTaxi');

-- CreateEnum
CREATE TYPE "OccurrenceCategory" AS ENUM ('AircraftIncident', 'GroundHandlingIncident', 'RampSafetyIncident', 'BaggageIncident', 'CargoIncident', 'DangerousGoodsIncident', 'PassengerHandlingIncident', 'SecurityRelatedOccurrence', 'OccupationalSafetyIncident', 'EquipmentVehicleIncident', 'MaintenanceRelatedOccurrence', 'EnvironmentalOccurrence', 'NearMiss', 'Other');

-- CreateEnum
CREATE TYPE "RiskSeverity" AS ENUM ('Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic');

-- CreateEnum
CREATE TYPE "RiskLikelihood" AS ENUM ('Rare', 'Unlikely', 'Possible', 'Likely', 'AlmostCertain');

-- CreateEnum
CREATE TYPE "InvestigationPriority" AS ENUM ('Routine', 'Elevated', 'Urgent', 'Immediate');

-- CreateEnum
CREATE TYPE "DamageLevel" AS ENUM ('None', 'Minor', 'Substantial', 'Destroyed');

-- CreateEnum
CREATE TYPE "InjuryLevel" AS ENUM ('None', 'Minor', 'Serious', 'Fatal');

-- CreateEnum
CREATE TYPE "FlightRules" AS ENUM ('VFR', 'IFR');

-- CreateEnum
CREATE TYPE "PersonRoleType" AS ENUM ('PIC', 'FirstOfficer', 'CabinCrew', 'ATC', 'GroundStaff', 'Maintenance', 'Passenger', 'Other');

-- CreateEnum
CREATE TYPE "ImmediateActionType" AS ENUM ('Safety', 'Operational', 'Notification');

-- AlterTable
ALTER TABLE "Occurrence" ADD COLUMN     "actualOutcomeDescription" TEXT,
ADD COLUMN     "actualOutcomeSeverity" "RiskSeverity",
ADD COLUMN     "briefDescription" VARCHAR(240),
ADD COLUMN     "classifiedAt" TIMESTAMP(3),
ADD COLUMN     "classifiedByUserId" INTEGER,
ADD COLUMN     "investigationPriority" "InvestigationPriority",
ADD COLUMN     "likelihoodOfRecurrence" "RiskLikelihood",
ADD COLUMN     "narrativeDescription" TEXT,
ADD COLUMN     "noEvidenceAvailableConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "noPersonsInvolvedConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "noWitnessesConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "occurrenceCategory" "OccurrenceCategory",
ADD COLUMN     "occurrenceSubcategoryId" INTEGER,
ADD COLUMN     "occurrenceTimeLocal" TIME,
ADD COLUMN     "occurrenceTimeUtc" TIME,
ADD COLUMN     "phaseOfFlight" "PhaseOfFlight",
ADD COLUMN     "potentialOutcomeDescription" TEXT,
ADD COLUMN     "potentialOutcomeSeverity" "RiskSeverity",
ADD COLUMN     "priorityOverridden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "priorityOverrideJustification" TEXT,
ADD COLUMN     "riskBand" VARCHAR(20),
ADD COLUMN     "riskScore" INTEGER,
ADD COLUMN     "severity" "RiskSeverity",
ADD COLUMN     "severityOverridden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "severityOverrideJustification" TEXT,
ADD COLUMN     "suggestedCategory" "OccurrenceCategory",
ADD COLUMN     "suggestedSubcategoryId" INTEGER,
ADD COLUMN     "wasSuggestionAccepted" BOOLEAN;

-- CreateTable
CREATE TABLE "OccurrenceSubcategoryOption" (
    "id" SERIAL NOT NULL,
    "category" "OccurrenceCategory" NOT NULL,
    "subcategory" VARCHAR(80) NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "OccurrenceSubcategoryOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aircraft" (
    "investigationId" INTEGER NOT NULL,
    "registration" VARCHAR(20) NOT NULL,
    "manufacturer" VARCHAR(100) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "serialNumber" VARCHAR(50),
    "yearOfManufacture" INTEGER,
    "operatorName" VARCHAR(150) NOT NULL,
    "engineType" VARCHAR(100),
    "engineCount" INTEGER NOT NULL DEFAULT 1,
    "damageLevel" "DamageLevel" NOT NULL DEFAULT 'None',

    CONSTRAINT "Aircraft_pkey" PRIMARY KEY ("investigationId")
);

-- CreateTable
CREATE TABLE "Flight" (
    "investigationId" INTEGER NOT NULL,
    "flightNumber" VARCHAR(20),
    "flightRules" "FlightRules" NOT NULL,
    "departureAerodrome" VARCHAR(100) NOT NULL,
    "destinationAerodrome" VARCHAR(100) NOT NULL,
    "alternateAerodrome" VARCHAR(100),
    "picName" VARCHAR(150) NOT NULL,
    "picLicenseNumber" VARCHAR(50),
    "crewComplement" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Flight_pkey" PRIMARY KEY ("investigationId")
);

-- CreateTable
CREATE TABLE "Location" (
    "investigationId" INTEGER NOT NULL,
    "locationDescription" TEXT NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "aerodromeCode" VARCHAR(10),
    "weatherVisibility" VARCHAR(50),
    "windSpeedKt" INTEGER,
    "windDirectionDeg" INTEGER,
    "cloudCover" VARCHAR(50),
    "temperatureC" INTEGER,
    "precipitation" VARCHAR(50),
    "runwayInUse" VARCHAR(20),
    "lightingConditions" VARCHAR(10) NOT NULL,
    "terrainType" VARCHAR(50),

    CONSTRAINT "Location_pkey" PRIMARY KEY ("investigationId")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" SERIAL NOT NULL,
    "investigationId" INTEGER NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "roleType" "PersonRoleType" NOT NULL,
    "licenseNumber" VARCHAR(50),
    "nationality" VARCHAR(60),
    "injuryLevel" "InjuryLevel" NOT NULL DEFAULT 'None',
    "notes" TEXT,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImmediateAction" (
    "id" SERIAL NOT NULL,
    "investigationId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "takenBy" VARCHAR(150) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "actionType" "ImmediateActionType" NOT NULL,

    CONSTRAINT "ImmediateAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskBandConfiguration" (
    "id" SERIAL NOT NULL,
    "minScore" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "bandLabel" VARCHAR(20) NOT NULL,
    "colorHint" VARCHAR(20),
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RiskBandConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OccurrenceSubcategoryOption_category_idx" ON "OccurrenceSubcategoryOption"("category");

-- CreateIndex
CREATE UNIQUE INDEX "OccurrenceSubcategoryOption_category_subcategory_key" ON "OccurrenceSubcategoryOption"("category", "subcategory");

-- CreateIndex
CREATE INDEX "Person_investigationId_idx" ON "Person"("investigationId");

-- CreateIndex
CREATE INDEX "ImmediateAction_investigationId_idx" ON "ImmediateAction"("investigationId");

-- CreateIndex
CREATE INDEX "RiskBandConfiguration_minScore_maxScore_idx" ON "RiskBandConfiguration"("minScore", "maxScore");

-- CreateIndex
CREATE INDEX "Occurrence_occurrenceCategory_idx" ON "Occurrence"("occurrenceCategory");

-- CreateIndex
CREATE INDEX "Occurrence_riskBand_idx" ON "Occurrence"("riskBand");

-- AddForeignKey
ALTER TABLE "Occurrence" ADD CONSTRAINT "Occurrence_occurrenceSubcategoryId_fkey" FOREIGN KEY ("occurrenceSubcategoryId") REFERENCES "OccurrenceSubcategoryOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Occurrence" ADD CONSTRAINT "Occurrence_suggestedSubcategoryId_fkey" FOREIGN KEY ("suggestedSubcategoryId") REFERENCES "OccurrenceSubcategoryOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Occurrence" ADD CONSTRAINT "Occurrence_classifiedByUserId_fkey" FOREIGN KEY ("classifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aircraft" ADD CONSTRAINT "Aircraft_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImmediateAction" ADD CONSTRAINT "ImmediateAction_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
