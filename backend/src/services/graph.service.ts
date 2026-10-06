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

  return {
    organizationId,

    nodes: entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      description: entity.description,
      entityType: entity.entityType.name,

      // Add this
      criticality: entity.criticality,
    })),

    edges: relationships.map((relationship) => ({
      id: relationship.id,
      source: relationship.sourceEntityId,
      target: relationship.targetEntityId,
      relationshipType: relationship.relationshipType,
    })),

    stats: {
      totalNodes: entities.length,
      totalEdges: relationships.length,
    },
  };
}