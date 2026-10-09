import { prisma } from "../lib/prisma.js";
import { publishRealtimeEvent } from "../lib/realtime.js";

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
  const duplicate = await prisma.entityType.findFirst({
    where: { organizationId, name },
    select: { id: true },
  });
  if (duplicate) {
    throw new Error("An entity type with this name already exists in this organization");
  }

  const entityType = await prisma.entityType.create({
    data: { organizationId, name, color },
    select: { id: true, name: true, color: true, createdAt: true },
  });
  await publishRealtimeEvent("ENTITY_TYPE_CREATED", organizationId, entityType);
  return entityType;
}

export async function updateEntityType(
  entityTypeId: string,
  organizationId: string,
  data: { name?: string; color?: string },
) {
  if (data.name) {
    const duplicate = await prisma.entityType.findFirst({
      where: {
        organizationId,
        name: data.name,
        NOT: { id: entityTypeId },
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new Error("An entity type with this name already exists in this organization");
    }
  }

  const entityType = await prisma.entityType.update({
    where: { id: entityTypeId, organizationId },
    data,
    select: { id: true, name: true, color: true, createdAt: true },
  });
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