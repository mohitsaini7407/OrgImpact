import { prisma } from "../lib/prisma.js";
export async function analyzeImpact(entityId) {
    const rootEntity = await prisma.entity.findUnique({
        where: { id: entityId },
        include: {
            entityType: true,
        },
    });
    if (!rootEntity) {
        return null;
    }
    const visited = new Set([entityId]);
    const affectedEntities = [];
    let currentLevel = [entityId];
    let depth = 1;
    while (currentLevel.length > 0) {
        const relationships = await prisma.relationship.findMany({
            where: {
                targetEntityId: {
                    in: currentLevel,
                },
            },
            include: {
                sourceEntity: {
                    include: {
                        entityType: true,
                    },
                },
            },
        });
        const nextLevel = [];
        for (const relationship of relationships) {
            const source = relationship.sourceEntity;
            if (visited.has(source.id)) {
                continue;
            }
            visited.add(source.id);
            affectedEntities.push({
                id: source.id,
                name: source.name,
                description: source.description,
                entityType: source.entityType.name,
                depth,
            });
            nextLevel.push(source.id);
        }
        currentLevel = nextLevel;
        depth++;
    }
    return {
        rootEntity: {
            id: rootEntity.id,
            name: rootEntity.name,
            description: rootEntity.description,
            entityType: rootEntity.entityType.name,
        },
        totalAffected: affectedEntities.length,
        affectedEntities,
    };
}
//# sourceMappingURL=impact.service.js.map