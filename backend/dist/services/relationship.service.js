import { prisma } from "../lib/prisma.js";
export async function createRelationship(organizationId, sourceEntityId, targetEntityId, relationshipType, createdById) {
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
    if (sourceEntity.organizationId !== organizationId ||
        targetEntity.organizationId !== organizationId) {
        throw new Error("Source and target entities must belong to the same organization");
    }
    if (sourceEntityId === targetEntityId) {
        throw new Error("Source and target entities cannot be the same");
    }
    return prisma.relationship.create({
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
}
export async function getOrganizationRelationships(organizationId) {
    return prisma.relationship.findMany({
        where: { organizationId },
        include: {
            sourceEntity: true,
            targetEntity: true,
        },
        orderBy: { createdAt: "asc" },
    });
}
export async function getRelationshipById(relationshipId) {
    return prisma.relationship.findUnique({
        where: { id: relationshipId },
        include: {
            sourceEntity: true,
            targetEntity: true,
        },
    });
}
export async function deleteRelationship(relationshipId) {
    return prisma.relationship.delete({
        where: { id: relationshipId },
    });
}
//# sourceMappingURL=relationship.service.js.map