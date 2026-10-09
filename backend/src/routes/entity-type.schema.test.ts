import assert from "node:assert/strict";
import test from "node:test";
import {
  createEntityTypeSchema,
  updateEntityTypeSchema,
} from "./entity-type.schema.js";

test("entity type creation trims names and accepts six-digit hex colors", () => {
  const result = createEntityTypeSchema.safeParse({
    organizationId: "e9cd3e97-f509-4a60-a8c8-390f2b9dd8a6",
    name: "  Data Pipeline  ",
    color: "#12aBcD",
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.name, "Data Pipeline");
    assert.equal(result.data.color, "#12aBcD");
  }
});

test("entity type creation rejects invalid colors and extra organization fields", () => {
  const base = {
    organizationId: "e9cd3e97-f509-4a60-a8c8-390f2b9dd8a6",
    name: "Data Pipeline",
  };

  assert.equal(createEntityTypeSchema.safeParse({ ...base, color: "blue" }).success, false);
  assert.equal(createEntityTypeSchema.safeParse({ ...base, color: "#123456", otherOrganizationId: "x" }).success, false);
});

test("entity type updates require at least one valid field", () => {
  assert.equal(updateEntityTypeSchema.safeParse({}).success, false);
  assert.equal(updateEntityTypeSchema.safeParse({ color: "#ABCDEF" }).success, true);
  assert.equal(updateEntityTypeSchema.safeParse({ name: "   " }).success, false);
});
