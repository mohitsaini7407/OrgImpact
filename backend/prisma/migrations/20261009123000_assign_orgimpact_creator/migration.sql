UPDATE "Organization" AS organization
SET "createdById" = account."id"
FROM "Membership" AS membership
JOIN "User" AS account ON account."id" = membership."userId"
WHERE membership."organizationId" = organization."id"
  AND LOWER(account."email") = LOWER('mohit@orgimpact.dev');
