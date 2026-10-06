import { prisma } from "../lib/prisma.js";
import { publishRealtimeEvent } from "../lib/realtime.js";

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

  const relationship = await prisma.relationship.create({
    data: {
      organizationId,
      sourceEntityId,
      targetEntityId,
      relationshipType,
      createdById: createdById ?? null,
    },
    include: {
      sourceEntity: true,
      targetEntity: true,
    },
  });

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
) {
  const relationship = await prisma.relationship.findUnique({
    where: { id: relationshipId },
  });

  if (!relationship) {
    throw new Error("Relationship not found");
  }

  await prisma.relationship.delete({
    where: { id: relationshipId },
  });

  await publishRealtimeEvent(
    "RELATIONSHIP_DELETED",
    relationship.organizationId,
    {
      id: relationship.id,
      organizationId: relationship.organizationId,
    });

  return {
    id: relationship.id,
    organizationId: relationship.organizationId,
  };
}