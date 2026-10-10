ALTER TABLE "Incident"
  ADD COLUMN "investigatedById" TEXT,
  ADD COLUMN "resolvedById" TEXT;

ALTER TABLE "Incident"
  ADD CONSTRAINT "Incident_investigatedById_fkey"
  FOREIGN KEY ("investigatedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Incident_resolvedById_fkey"
  FOREIGN KEY ("resolvedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Incident_investigatedById_idx" ON "Incident"("investigatedById");
CREATE INDEX "Incident_resolvedById_idx" ON "Incident"("resolvedById");
