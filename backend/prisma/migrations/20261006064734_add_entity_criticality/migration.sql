-- AlterTable
ALTER TABLE "Entity" ADD COLUMN     "criticality" TEXT NOT NULL DEFAULT 'MEDIUM';

-- CreateIndex
CREATE INDEX "Entity_criticality_idx" ON "Entity"("criticality");
