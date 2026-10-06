import { prisma } from "../lib/prisma.js";
import { publishRealtimeEvent } from "../lib/realtime.js";

export async function createEntity(
  organizationId: string,
  entityTypeId: string,
  name: string,
  description?: string,
  criticality = "MEDIUM",
) {
  const entityType = await prisma.entityType.findUnique({
    where: {
      id: entityTypeId,
    },
  });

  if (!entityType) {
    throw new Error("Entity type not found");
  }

  const entity = await prisma.entity.create({
    data: {
      organizationId,
      entityTypeId,
      name,
      description: description ?? null,
      criticality,
    },
    include: {
      entityType: true,
    },
  });

  await publishRealtimeEvent(
    "ENTITY_CREATED",
    organizationId,
    entity,
  );

  return entity;
}

export async function getOrganizationEntities(
  organizationId: string,
) {
  return prisma.entity.findMany({
    where: {
      organizationId,
    },
    include: {
      entityType: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function getEntityById(
  entityId: string,
) {
  return prisma.entity.findUnique({
    where: {
      id: entityId,
    },
    include: {
      entityType: true,
    },
  });
}

export async function updateEntity(
  entityId: string,
  data: {
    name?: string;
    description?: string | null;
    criticality?: string;
  },
) {
  const existingEntity = await prisma.entity.findUnique({
    where: {
      id: entityId,
    },
  });

  if (!existingEntity) {
    throw new Error("Entity not found");
  }

  const entity = await prisma.entity.update({
    where: {
      id: entityId,
    },
    data,
    include: {
      entityType: true,
    },
  });

  await publishRealtimeEvent(
    "ENTITY_UPDATED",
    entity.organizationId,
    entity,
  );

  return entity;
}

export async function deleteEntity(
  entityId: string,
) {
  const entity = await prisma.entity.findUnique({
    where: {
      id: entityId,
    },
  });

  if (!entity) {
    throw new Error("Entity not found");
  }

  await prisma.entity.delete({
    where: {
      id: entityId,
    },
  });

  await publishRealtimeEvent(
    "ENTITY_DELETED",
    entity.organizationId,
    {
      id: entity.id,
      organizationId: entity.organizationId,
    },
  );

  return {
    id: entity.id,
    organizationId: entity.organizationId,
  };
}