INSERT INTO "RelationshipType" ("id", "organizationId", "name")
SELECT gen_random_uuid()::text, organization."id", defaults."name"
FROM "Organization" AS organization
CROSS JOIN (VALUES ('DEPENDS_ON'), ('CALLS')) AS defaults("name")
ON CONFLICT ("organizationId", "name") DO NOTHING;
