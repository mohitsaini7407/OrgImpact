CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Preserve the legacy shared catalog by creating an organization-specific copy
-- of every legacy type for each organization that uses it. Existing entity
-- references are updated to the matching organization-specific type.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "EntityType")
     AND NOT EXISTS (SELECT 1 FROM "Organization") THEN
    RAISE EXCEPTION 'Cannot scope existing entity types without an organization';
  END IF;
END $$;

CREATE TEMP TABLE "_EntityTypeMigrationMap" ON COMMIT DROP AS
SELECT
  legacy."id" AS "legacyId",
  organization."id" AS "organizationId",
  CASE
    WHEN ROW_NUMBER() OVER (PARTITION BY legacy."id" ORDER BY organization."id") = 1
      THEN legacy."id"
    ELSE gen_random_uuid()::text
  END AS "scopedId",
  legacy."name" AS "name",
  CASE LOWER(legacy."name")
    WHEN 'service' THEN '#2563EB'
    WHEN 'database' THEN '#16A34A'
    WHEN 'application' THEN '#9333EA'
    WHEN 'infrastructure' THEN '#EA580C'
    WHEN 'network' THEN '#0891B2'
    WHEN 'security' THEN '#DC2626'
    ELSE '#64748B'
  END AS "color",
  legacy."createdAt" AS "createdAt"
FROM "EntityType" AS legacy
CROSS JOIN "Organization" AS organization
WHERE EXISTS (
  SELECT 1
  FROM "Entity" AS entity
  WHERE entity."entityTypeId" = legacy."id"
    AND entity."organizationId" = organization."id"
);

ALTER TABLE "EntityType"
  ADD COLUMN "organizationId" TEXT,
  ADD COLUMN "color" TEXT NOT NULL DEFAULT '#2563EB';

DROP INDEX "EntityType_name_key";

UPDATE "EntityType" AS entity_type
SET
  "organizationId" = mapping."organizationId",
  "color" = mapping."color"
FROM "_EntityTypeMigrationMap" AS mapping
WHERE entity_type."id" = mapping."legacyId"
  AND mapping."scopedId" = mapping."legacyId";

INSERT INTO "EntityType" ("id", "organizationId", "name", "color", "createdAt")
SELECT mapping."scopedId", mapping."organizationId", mapping."name", mapping."color", mapping."createdAt"
FROM "_EntityTypeMigrationMap" AS mapping
WHERE mapping."scopedId" <> mapping."legacyId";

UPDATE "Entity" AS entity
SET "entityTypeId" = mapping."scopedId"
FROM "_EntityTypeMigrationMap" AS mapping
WHERE entity."entityTypeId" = mapping."legacyId"
  AND entity."organizationId" = mapping."organizationId";

ALTER TABLE "EntityType"
  ALTER COLUMN "organizationId" SET NOT NULL;

INSERT INTO "EntityType" ("id", "organizationId", "name", "color")
SELECT gen_random_uuid()::text, organization."id", suggested."name", suggested."color"
FROM "Organization" AS organization
CROSS JOIN (VALUES
  ('Service', '#2563EB'),
  ('Database', '#16A34A'),
  ('Application', '#9333EA'),
  ('Infrastructure', '#EA580C'),
  ('Network', '#0891B2'),
  ('Security', '#DC2626')
) AS suggested("name", "color")
WHERE NOT EXISTS (
  SELECT 1
  FROM "EntityType" AS existing
  WHERE existing."organizationId" = organization."id"
    AND existing."name" = suggested."name"
);

ALTER TABLE "Entity"
  DROP CONSTRAINT "Entity_entityTypeId_fkey";

CREATE UNIQUE INDEX "EntityType_organizationId_name_key"
  ON "EntityType"("organizationId", "name");
CREATE UNIQUE INDEX "EntityType_id_organizationId_key"
  ON "EntityType"("id", "organizationId");

ALTER TABLE "EntityType"
  ADD CONSTRAINT "EntityType_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Entity"
  ADD CONSTRAINT "Entity_entityTypeId_organizationId_fkey"
  FOREIGN KEY ("entityTypeId", "organizationId")
  REFERENCES "EntityType"("id", "organizationId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Entity_organizationId_entityTypeId_idx"
  ON "Entity"("organizationId", "entityTypeId");
