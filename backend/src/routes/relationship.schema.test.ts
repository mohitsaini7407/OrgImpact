import assert from "node:assert/strict";
import test from "node:test";
import { createRelationshipSchema, normalizeRelationshipType } from "./relationship.schema.js";

const base = {
  organizationId: "e9cd3e97-f509-4a60-a8c8-390f2b9dd8a6",
  sourceEntityId: "97d5b859-cf09-44b3-bb9b-5eff0fd31160",
  targetEntityId: "356a3ca0-1a03-492e-a785-1bfa4479b300",
};

test("relationship types normalize to uppercase custom values", () => {
  const result = createRelationshipSchema.safeParse({ ...base, relationshipType: " depends_on " });
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.relationshipType, "DEPENDS_ON");
  assert.equal(normalizeRelationshipType(" calls "), "CALLS");
});

test("relationship creation accepts a non-empty custom relationship type", () => {
  assert.equal(createRelationshipSchema.safeParse({ ...base, relationshipType: " RELATED_TO " }).success, true);
  assert.equal(createRelationshipSchema.safeParse({ ...base, relationshipType: " " }).success, false);
});
