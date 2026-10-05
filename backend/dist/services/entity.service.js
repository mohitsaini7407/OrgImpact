import { prisma } from "../lib/prisma.js";
import { getIO } from "../socket.js";
export async function createEntity(organizationId, entityTypeId, name, description) {
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
export async function getOrganizationEntities(organizationId) {
    return prisma.entity.findMany({
        where: { organizationId },
        include: {
            entityType: true,
        },
        orderBy: { createdAt: "asc" },
    });
}
export async function getEntityById(entityId) {
    return prisma.entity.findUnique({
        where: { id: entityId },
        include: {
            entityType: true,
        },
    });
}
export async function updateEntity(entityId, data) {
    return prisma.entity.update({
        where: { id: entityId },
        data,
        include: {
            entityType: true,
        },
    });
}
export async function deleteEntity(entityId) {
    return prisma.entity.delete({
        where: { id: entityId },
    });
}
//# sourceMappingURL=entity.service.js.map