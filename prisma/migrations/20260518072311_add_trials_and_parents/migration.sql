-- CreateTable
CREATE TABLE "Parent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "telegramChatId" TEXT,
    "acquisitionSource" "AcquisitionSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Parent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrialLesson" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BOOKED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrialLesson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Parent_tenantId_idx" ON "Parent"("tenantId");

-- CreateIndex
CREATE INDEX "Parent_tenantId_telegramChatId_idx" ON "Parent"("tenantId", "telegramChatId");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_tenantId_phone_key" ON "Parent"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "TrialLesson_tenantId_scheduledAt_idx" ON "TrialLesson"("tenantId", "scheduledAt");

-- CreateIndex
CREATE INDEX "TrialLesson_tenantId_leadId_idx" ON "TrialLesson"("tenantId", "leadId");

-- AddForeignKey
ALTER TABLE "TrialLesson" ADD CONSTRAINT "TrialLesson_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
