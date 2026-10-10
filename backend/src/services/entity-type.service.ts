import { prisma } from "../lib/prisma.js";
import { publishRealtimeEvent } from "../lib/realtime.js";
import { normalizeEntityTypeName } from "../routes/entity-type.schema.js";

const duplicateEntityTypeMessage = "An entity type with this name already exists in this organization";

function isUniqueConstraintError(error: unknown): error is { code: "P2002" } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function getEntityTypes(organizationId: string) {
  return prisma.entityType.findMany({
    where: { organizationId },
    select: { id: true, name: true, color: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function createEntityType(
  organizationId: string,
  name: string,
  color: string,
) {
  const normalizedName = name.trim();
  let entityType;
  try {
    entityType = await prisma.$transaction(async (transaction) => {
      const lockKey = `entity-type:${organizationId}:${normalizeEntityTypeName(normalizedName)}`;
      await transaction.$queryRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))::text AS locked", lockKey);
      const existingNames = await transaction.entityType.findMany({
        where: { organizationId },
        select: { name: true },
      });
      if (existingNames.some((existing) => normalizeEntityTypeName(existing.name) === normalizeEntityTypeName(normalizedName))) {
        throw new Error(duplicateEntityTypeMessage);
      }
      return transaction.entityType.create({
        data: { organizationId, name: normalizedName, color },
        select: { id: true, name: true, color: true, createdAt: true },
      });
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new Error(duplicateEntityTypeMessage);
    throw error;
  }
  await publishRealtimeEvent("ENTITY_TYPE_CREATED", organizationId, entityType);
  return entityType;
}

export async function updateEntityType(
  entityTypeId: string,
  organizationId: string,
  data: { name?: string; color?: string },
) {
  const normalizedData = data.name === undefined ? data : { ...data, name: data.name.trim() };
  let entityType;
  try {
    entityType = await prisma.$transaction(async (transaction) => {
      if (normalizedData.name !== undefined) {
        const normalizedName = normalizeEntityTypeName(normalizedData.name);
        const lockKey = `entity-type:${organizationId}:${normalizedName}`;
        await transaction.$queryRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))::text AS locked", lockKey);
        const existingNames = await transaction.entityType.findMany({
          where: { organizationId, NOT: { id: entityTypeId } },
          select: { name: true },
        });
        if (existingNames.some((existing) => normalizeEntityTypeName(existing.name) === normalizedName)) {
          throw new Error(duplicateEntityTypeMessage);
        }
      }
      return transaction.entityType.update({
        where: { id: entityTypeId, organizationId },
        data: normalizedData,
        select: { id: true, name: true, color: true, createdAt: true },
      });
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new Error(duplicateEntityTypeMessage);
    throw error;
  }
  await publishRealtimeEvent("ENTITY_TYPE_UPDATED", organizationId, entityType);
  return entityType;
}

export async function deleteEntityType(
  entityTypeId: string,
  organizationId: string,
) {
  const entityCount = await prisma.entity.count({
    where: { entityTypeId, organizationId },
  });
  if (entityCount > 0) {
    throw new Error("Entity type is assigned to entities and cannot be deleted");
  }

  await prisma.entityType.delete({
    where: { id: entityTypeId, organizationId },
  });
  await publishRealtimeEvent("ENTITY_TYPE_DELETED", organizationId, { id: entityTypeId });
}
