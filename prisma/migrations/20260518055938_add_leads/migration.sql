-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NEW', 'CONTACTED', 'TRIAL_BOOKED', 'TRIAL_DONE', 'NEGOTIATION', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "AcquisitionSource" AS ENUM ('INSTAGRAM', 'WEBSITE', 'REFERRAL', 'WALK_IN', 'TELEGRAM', 'OTHER');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "parentPhone" TEXT NOT NULL,
    "parentEmail" TEXT,
    "childName" TEXT,
    "childAge" INTEGER,
    "acquisitionSource" "AcquisitionSource" NOT NULL,
    "stage" "LeadStage" NOT NULL DEFAULT 'NEW',
    "assignedTo" TEXT,
    "notes" TEXT,
    "convertedParentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_tenantId_stage_idx" ON "Lead"("tenantId", "stage");

-- CreateIndex
CREATE INDEX "Lead_tenantId_parentPhone_idx" ON "Lead"("tenantId", "parentPhone");

-- CreateIndex
CREATE INDEX "Lead_tenantId_assignedTo_idx" ON "Lead"("tenantId", "assignedTo");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
