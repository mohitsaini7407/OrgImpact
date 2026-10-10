import { prisma } from "../lib/prisma.js";

type ImpactNode = {
  id: string;
  name: string;
  description: string | null;
  entityType: string;
  entityTypeColor: string;
  relationshipTypes: string[];
  depth: number;
};

export async function analyzeImpact(entityId: string, organizationId: string) {
  const rootEntity = await prisma.entity.findFirst({
    where: {
      id: entityId,
      organizationId,
    },
    include: {
      entityType: true,
    },
  });

  if (!rootEntity) {
    return null;
  }

  const visited = new Set<string>([entityId]);

  const affectedEntities: ImpactNode[] = [];
  let entitiesWithMissingType = rootEntity.entityType ? 0 : 1;

  let currentLevel = [entityId];
  let depth = 1;

  while (currentLevel.length > 0) {
    const relationships = await prisma.relationship.findMany({
      where: {
        organizationId,
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

    const nextLevel: string[] = [];
    const discoveries = new Map<string, { source: typeof relationships[number]["sourceEntity"]; relationshipTypes: Set<string> }>();

    for (const relationship of relationships) {
      const source = relationship.sourceEntity;
      if (source.organizationId !== organizationId || visited.has(source.id)) continue;
      const discovery = discoveries.get(source.id) ?? { source, relationshipTypes: new Set<string>() };
      discovery.relationshipTypes.add(relationship.relationshipType);
      discoveries.set(source.id, discovery);
    }

    for (const [sourceId, { source, relationshipTypes }] of discoveries) {
      if (!source.entityType) entitiesWithMissingType += 1;
      visited.add(sourceId);
      affectedEntities.push({
        id: source.id,
        name: source.name,
        description: source.description,
        entityType: source.entityType?.name ?? "Unknown type",
        entityTypeColor: source.entityType?.color ?? "#64748B",
        relationshipTypes: [...relationshipTypes].sort(),
        depth,
      });
      nextLevel.push(sourceId);
    }

    currentLevel = nextLevel;
    depth++;
  }

  return {
    rootEntity: {
      id: rootEntity.id,
      name: rootEntity.name,
      description: rootEntity.description,
      entityType: rootEntity.entityType?.name ?? "Unknown type",
      entityTypeColor: rootEntity.entityType?.color ?? "#64748B",
    },
    totalAffected: affectedEntities.length,
    affectedEntities,
    warnings: entitiesWithMissingType > 0
      ? [`${entitiesWithMissingType} entities have no valid entity type in this organization. They are shown as "Unknown type".`]
      : [],
  };
}