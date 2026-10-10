CREATE TABLE "RelationshipType" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RelationshipType_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RelationshipType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RelationshipType_organizationId_name_key" ON "RelationshipType"("organizationId", "name");
CREATE INDEX "RelationshipType_organizationId_idx" ON "RelationshipType"("organizationId");

INSERT INTO "RelationshipType" ("id", "organizationId", "name")
SELECT gen_random_uuid()::text, organization."id", defaults."name"
FROM "Organization" AS organization
CROSS JOIN (VALUES ('DEPENDS_ON'), ('CALLS'), ('USES'), ('RUNS_ON'), ('CONTAINS')) AS defaults("name")
WHERE true
ON CONFLICT ("organizationId", "name") DO NOTHING;

INSERT INTO "RelationshipType" ("id", "organizationId", "name")
SELECT DISTINCT ON (relationship."organizationId", upper(btrim(relationship."relationshipType")))
    gen_random_uuid()::text, relationship."organizationId", upper(btrim(relationship."relationshipType"))
FROM "Relationship" AS relationship
WHERE btrim(relationship."relationshipType") <> ''
ORDER BY relationship."organizationId", upper(btrim(relationship."relationshipType"))
ON CONFLICT ("organizationId", "name") DO NOTHING;
