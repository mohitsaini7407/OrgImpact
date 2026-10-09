ALTER TABLE "Organization"
ADD COLUMN "createdById" TEXT;

UPDATE "Organization" AS organization
SET "createdById" = (
  SELECT membership."userId"
  FROM "Membership" AS membership
  WHERE membership."organizationId" = organization."id"
  ORDER BY membership."createdAt" ASC, membership."id" ASC
  LIMIT 1
);

CREATE INDEX "Organization_createdById_idx"
ON "Organization"("createdById");

ALTER TABLE "Organization"
ADD CONSTRAINT "Organization_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
