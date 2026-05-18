-- AlterTable
ALTER TABLE "Payment"
  ADD COLUMN "refundedAt" TIMESTAMP(3),
  ADD COLUMN "refundedAmount" DECIMAL(12, 2),
  ADD COLUMN "refundReason" TEXT;

-- CreateIndex
CREATE INDEX "Payment_tenantId_refundedAt_idx" ON "Payment"("tenantId", "refundedAt");
