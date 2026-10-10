import { prisma } from "../lib/prisma.js";
import { publishRealtimeEvent } from "../lib/realtime.js";
import { normalizeRelationshipType } from "../routes/relationship.schema.js";

const duplicateRelationshipMessage = "This relationship already exists between these entities.";

function isUniqueConstraintError(error: unknown): error is { code: "P2002" } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function createRelationship(
  organizationId: string,
  sourceEntityId: string,
  targetEntityId: string,
  relationshipType: string,
  createdById?: string,
) {
  const [sourceEntity, targetEntity] = await Promise.all([
    prisma.entity.findUnique({
      where: { id: sourceEntityId },
    }),
    prisma.entity.findUnique({
      where: { id: targetEntityId },
    }),
  ]);

  if (!sourceEntity) {
    throw new Error("Source entity not found");
  }

  if (!targetEntity) {
    throw new Error("Target entity not found");
  }

  if (
    sourceEntity.organizationId !== organizationId ||
    targetEntity.organizationId !== organizationId
  ) {
    throw new Error(
      "Source and target entities must belong to the same organization",
    );
  }

  if (sourceEntityId === targetEntityId) {
    throw new Error(
      "Source and target entities cannot be the same",
    );
  }

  const normalizedType = normalizeRelationshipType(relationshipType);
  const uniquenessKey = JSON.stringify([
    organizationId,
    sourceEntityId,
    targetEntityId,
    normalizedType.toLowerCase(),
  ]);
  let relationship;
  try {
    relationship = await prisma.$transaction(async (transaction) => {
      // Serialize duplicate checks for this directed tuple, including when a
      // pre-existing duplicate prevents installing the expression index.
      const typeLockKey = "relationship-type:" + organizationId + ":" + normalizedType;
      await transaction.$queryRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))::text AS locked", typeLockKey);
      const relationshipTypeRecord = await transaction.relationshipType.findFirst({
        where: { organizationId, name: normalizedType },
        select: { id: true },
      });
      if (!relationshipTypeRecord) throw new Error("Relationship type not found");

      await transaction.$queryRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))::text AS locked", uniquenessKey);
      const existing = await transaction.relationship.findFirst({
        where: { organizationId, sourceEntityId, targetEntityId },
        select: { relationshipType: true },
      });
      if (existing && normalizeRelationshipType(existing.relationshipType) === normalizedType) {
        throw new Error(duplicateRelationshipMessage);
      }
      return transaction.relationship.create({
        data: {
          organizationId,
          sourceEntityId,
          targetEntityId,
          relationshipType: normalizedType,
          createdById: createdById ?? null,
        },
        include: {
          sourceEntity: true,
          targetEntity: true,
        },
      });
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new Error(duplicateRelationshipMessage);
    throw error;
  }

  await publishRealtimeEvent(
    "RELATIONSHIP_CREATED",
    organizationId,
    relationship,
  );

  return relationship;
}

export async function getOrganizationRelationships(
  organizationId: string,
) {
  return prisma.relationship.findMany({
    where: { organizationId },
    include: {
      sourceEntity: true,
      targetEntity: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getRelationshipById(
  relationshipId: string,
) {
  return prisma.relationship.findUnique({
    where: { id: relationshipId },
    include: {
      sourceEntity: true,
      targetEntity: true,
    },
  });
}

export async function deleteRelationship(
  relationshipId: string,
  organizationId: string,
) {
  const relationship = await prisma.relationship.findFirst({
    where: {
      id: relationshipId,
      organizationId,
    },
  });

  if (!relationship) {
    throw new Error("Relationship not found");
  }

  await prisma.relationship.delete({
    where: {
      id: relationshipId,
    },
  });

  await publishRealtimeEvent(
    "RELATIONSHIP_DELETED",
    organizationId,
    {
      id: relationship.id,
      organizationId: relationship.organizationId,
    },
  );

  return {
    id: relationship.id,
    organizationId: relationship.organizationId,
  };
}
