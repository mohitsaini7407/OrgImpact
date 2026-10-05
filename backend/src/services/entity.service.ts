import { prisma } from "../lib/prisma.js";
import { getIO } from "../socket.js";

export async function createEntity(
  organizationId: string,
  entityTypeId: string,
  name: string,
  description?: string,
) {
  const entity = await prisma.entity.create({
    data: {
      organizationId,
      entityTypeId,
      name,
      description: description ?? null,
    },
    include: {
      entityType: true,
    },
  });

  getIO()
    .to(`organization:${organizationId}`)
    .emit("ENTITY_CREATED", entity);

  return entity;
}

export async function getOrganizationEntities(organizationId: string) {
  return prisma.entity.findMany({
    where: { organizationId },
    include: {
      entityType: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getEntityById(entityId: string) {
  return prisma.entity.findUnique({
    where: { id: entityId },
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
    entityTypeId?: string;
  },
) {
  const entity = await prisma.entity.update({
    where: { id: entityId },
    data,
    include: {
      entityType: true,
    },
  });

  getIO()
    .to(`organization:${entity.organizationId}`)
    .emit("ENTITY_UPDATED", entity);

  return entity;
}

export async function deleteEntity(entityId: string) {
  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
  });

  if (!entity) {
    throw new Error("Entity not found");
  }

  await prisma.entity.delete({
    where: { id: entityId },
  });

  getIO()
    .to(`organization:${entity.organizationId}`)
    .emit("ENTITY_DELETED", {
      id: entity.id,
      organizationId: entity.organizationId,
    });

  return {
    id: entity.id,
    organizationId: entity.organizationId,
  };
}