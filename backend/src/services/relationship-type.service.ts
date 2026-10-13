import { prisma } from "../lib/prisma.js";
import { publishRealtimeEvent } from "../lib/realtime.js";
import { normalizeRelationshipTypeName } from "../routes/relationship-type.schema.js";

const duplicateTypeMessage = "A relationship type with this name already exists in this organization";
const assignedTypeMessage = "Relationship type is assigned to relationships and cannot be deleted";
const coreRelationshipTypes = ["DEPENDS_ON", "CALLS"];

function isUniqueConstraintError(error: unknown): error is { code: "P2002" } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function getRelationshipTypes(organizationId: string) {
  await prisma.relationshipType.createMany({
    data: coreRelationshipTypes.map((name) => ({ organizationId, name })),
    skipDuplicates: true,
  });
  return prisma.relationshipType.findMany({
    where: { organizationId },
    select: { id: true, name: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function createRelationshipType(organizationId: string, name: string) {
  const normalizedName = normalizeRelationshipTypeName(name);
  const existing = await prisma.relationshipType.findFirst({
    where: {
      organizationId,
      name: { equals: normalizedName, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (existing) throw new Error(duplicateTypeMessage);

  let relationshipType;
  try {
    relationshipType = await prisma.relationshipType.create({
      data: { organizationId, name: normalizedName },
      select: { id: true, name: true, createdAt: true },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new Error(duplicateTypeMessage);
    throw error;
  }
  await publishRealtimeEvent("RELATIONSHIP_TYPE_CREATED", organizationId, relationshipType);
  return relationshipType;
}

export async function deleteRelationshipType(relationshipTypeId: string, organizationId: string) {
  await prisma.$transaction(async (transaction) => {
    const relationshipType = await transaction.relationshipType.findFirst({
      where: { id: relationshipTypeId, organizationId },
      select: { id: true, name: true },
    });
    if (!relationshipType) throw new Error("Relationship type not found");

    const normalizedName = normalizeRelationshipTypeName(relationshipType.name);
    if (coreRelationshipTypes.includes(normalizedName)) {
      throw new Error("Default relationship types cannot be deleted");
    }
    const lockKey = "relationship-type:" + organizationId + ":" + normalizedName;
    try {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}::text))`;
    } catch {
      // Fallback if pooler disallows advisory locks
    }

    const currentType = await transaction.relationshipType.findFirst({
      where: { id: relationshipTypeId, organizationId },
      select: { id: true },
    });
    if (!currentType) throw new Error("Relationship type not found");

    const assignedRelationships = await transaction.relationship.findMany({
      where: { organizationId },
      select: { relationshipType: true },
    });
    if (assignedRelationships.some((relationship) =>
      normalizeRelationshipTypeName(relationship.relationshipType) === normalizedName
    )) throw new Error(assignedTypeMessage);

    await transaction.relationshipType.deleteMany({ where: { id: relationshipTypeId, organizationId } });
  });
  await publishRealtimeEvent("RELATIONSHIP_TYPE_DELETED", organizationId, { id: relationshipTypeId });
}
