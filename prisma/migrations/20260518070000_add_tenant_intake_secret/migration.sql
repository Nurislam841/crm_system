-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "intakeSecret" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_intakeSecret_key" ON "Tenant"("intakeSecret");
