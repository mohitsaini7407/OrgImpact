-- Protect organization-scoped directed relationships from concurrent duplicates.
-- Existing entity-type names that differ only by case are preserved. Entity-type
-- create/update writes serialize normalized-name checks in the service layer.
-- Prisma cannot model the expression indexes below, so keep them here in SQL.
-- Abort without changing data if existing relationships collide after normalization.
DO $$
DECLARE
  duplicate_relationship_groups INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO duplicate_relationship_groups
  FROM (
    SELECT 1
    FROM "Relationship"
    GROUP BY "organizationId", "sourceEntityId", "targetEntityId", lower(btrim("relationshipType"))
    HAVING COUNT(*) > 1
  ) AS duplicate_groups;

  IF duplicate_relationship_groups > 0 THEN
    RAISE EXCEPTION
      'Normalized uniqueness migration blocked: % directed-relationship duplicate groups require reviewed remediation.',
      duplicate_relationship_groups;
  END IF;
END $$;

-- A non-unique normalized index supports efficient service-layer duplicate checks
-- while retaining any legacy case-only duplicates already in the database.
CREATE INDEX "EntityType_organizationId_normalized_name_idx"
  ON "EntityType" ("organizationId", lower(btrim("name")));

CREATE UNIQUE INDEX "Relationship_org_source_target_normalized_type_key"
  ON "Relationship" ("organizationId", "sourceEntityId", "targetEntityId", lower(btrim("relationshipType")));
