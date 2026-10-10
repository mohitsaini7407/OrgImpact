import { prisma } from "../lib/prisma.js";

export async function getOrganizationGraph(organizationId: string) {
  const [entities, relationships] = await Promise.all([
    prisma.entity.findMany({
      where: { organizationId },
      include: {
        entityType: true,
      },
      orderBy: { createdAt: "asc" },
    }),

    prisma.relationship.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const entitiesWithMissingType = entities.filter((entity) => !entity.entityType).length;
  const entityNames = new Map(entities.map((entity) => [entity.id, entity.name]));
  const entityIds = new Set(entities.map((entity) => entity.id));
  const validRelationships = relationships.filter((relationship) =>
    entityIds.has(relationship.sourceEntityId) && entityIds.has(relationship.targetEntityId),
  );
  const invalidRelationshipCount = relationships.length - validRelationships.length;
  const relationshipCounts = new Map<string, {
    sourceName: string;
    targetName: string;
    relationshipType: string;
    count: number;
  }>();
  for (const relationship of validRelationships) {
    const key = JSON.stringify([
      relationship.organizationId,
      relationship.sourceEntityId,
      relationship.targetEntityId,
      relationship.relationshipType.trim().toLowerCase(),
    ]);
    const group = relationshipCounts.get(key);
    if (group) {
      group.count += 1;
    } else {
      relationshipCounts.set(key, {
        sourceName: entityNames.get(relationship.sourceEntityId) ?? relationship.sourceEntityId,
        targetName: entityNames.get(relationship.targetEntityId) ?? relationship.targetEntityId,
        relationshipType: relationship.relationshipType.trim(),
        count: 1,
      });
    }
  }
  const duplicateRelationships = [...relationshipCounts.values()].filter((group) => group.count > 1);
  const warnings: string[] = [];
  if (entitiesWithMissingType > 0) {
    warnings.push(`${entitiesWithMissingType} entities have no valid entity type in this organization. They are shown as "Unknown type".`);
  }
  if (invalidRelationshipCount > 0) {
    warnings.push(`${invalidRelationshipCount} relationship${invalidRelationshipCount === 1 ? " has" : "s have"} an endpoint outside this organization and ${invalidRelationshipCount === 1 ? "was" : "were"} omitted from the graph.`);
  }
  if (duplicateRelationships.length > 0) {
    const examples = duplicateRelationships.slice(0, 3)
      .map((group) => `${group.sourceName} → ${group.targetName} (${group.relationshipType}, ${group.count} records)`)
      .join("; ");
    const remaining = duplicateRelationships.length > 3 ? `; and ${duplicateRelationships.length - 3} more group(s)` : "";
    warnings.push(`Duplicate directed relationships found: ${examples}${remaining}. All records remain visible; review the data before cleanup.`);
  }

  return {
    organizationId,

    nodes: entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      description: entity.description,
      entityType: entity.entityType?.name ?? "Unknown type",
      entityTypeColor: entity.entityType?.color ?? "#64748B",
      criticality: entity.criticality,
    })),

    edges: validRelationships.map((relationship) => ({
      id: relationship.id,
      source: relationship.sourceEntityId,
      target: relationship.targetEntityId,
      relationshipType: relationship.relationshipType,
    })),

    stats: {
      totalNodes: entities.length,
      totalEdges: validRelationships.length,
    },
    warnings,
  };
}
