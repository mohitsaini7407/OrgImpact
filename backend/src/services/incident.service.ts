import { prisma } from "../lib/prisma.js";
import { publishRealtimeEvent } from "../lib/realtime.js";
import { analyzeImpact } from "./impact.service.js";

export async function createIncident(
  organizationId: string,
  affectedEntityId: string,
  createdById: string,
  title: string,
  description?: string,
  severity = "MEDIUM",
) {
  const entity = await prisma.entity.findUnique({
    where: {
      id: affectedEntityId,
    },
  });

  if (!entity) {
    throw new Error("Affected entity not found");
  }

  if (entity.organizationId !== organizationId) {
    throw new Error(
      "Affected entity must belong to the same organization",
    );
  }

  const incident = await prisma.incident.create({
    data: {
      organizationId,
      affectedEntityId,
      createdById,
      title,
      description: description ?? null,
      severity,
    },
    include: {
      affectedEntity: {
        include: {
          entityType: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  await publishRealtimeEvent(
    "INCIDENT_CREATED",
    organizationId,
    incident,
  );

  return incident;
}

export async function getOrganizationIncidents(
  organizationId: string,
) {
  return prisma.incident.findMany({
    where: {
      organizationId,
    },
    include: {
      affectedEntity: {
        include: {
          entityType: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getIncidentById(
  incidentId: string,
  organizationId: string,
) {
  return prisma.incident.findFirst({
    where: {
      id: incidentId,
      organizationId,
    },
    include: {
      affectedEntity: {
        include: {
          entityType: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function updateIncident(
  incidentId: string,
  organizationId: string,
  data: {
    title?: string;
    description?: string | null;
    severity?: string;
    status?: string;
  },
) {
  const existingIncident = await prisma.incident.findFirst({
    where: {
      id: incidentId,
      organizationId,
    },
  });

  if (!existingIncident) {
    throw new Error("Incident not found");
  }

  const updateData: {
    title?: string;
    description?: string | null;
    severity?: string;
    status?: string;
    resolvedAt?: Date | null;
  } = {
    ...data,
  };

  if (data.status === "RESOLVED") {
    updateData.resolvedAt = new Date();
  }

  if (
    data.status &&
    data.status !== "RESOLVED" &&
    existingIncident.status === "RESOLVED"
  ) {
    updateData.resolvedAt = null;
  }

  const incident = await prisma.incident.update({
    where: {
      id: incidentId,
    },
    data: updateData,
    include: {
      affectedEntity: {
        include: {
          entityType: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  await publishRealtimeEvent(
    "INCIDENT_UPDATED",
    incident.organizationId,
    incident,
  );

  return incident;
}

export async function deleteIncident(
  incidentId: string,
  organizationId: string,
) {
  const incident = await prisma.incident.findFirst({
    where: {
      id: incidentId,
      organizationId,
    },
  });

  if (!incident) {
    throw new Error("Incident not found");
  }

  await prisma.incident.delete({
    where: {
      id: incidentId,
    },
  });

  await publishRealtimeEvent(
    "INCIDENT_DELETED",
    incident.organizationId,
    {
      id: incident.id,
      organizationId: incident.organizationId,
    },
  );

  return {
    id: incident.id,
    organizationId: incident.organizationId,
  };
}

/**
 * Analyze the impact / blast radius of an incident.
 *
 * The incident points to an affected entity.
 * The existing impact analysis engine then traverses
 * the dependency graph starting from that entity.
 */
export async function getIncidentImpact(
  incidentId: string,
  organizationId: string,
) {
  const incident = await prisma.incident.findFirst({
    where: {
      id: incidentId,
      organizationId,
    },
    include: {
      affectedEntity: {
        include: {
          entityType: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!incident) {
    throw new Error("Incident not found");
  }

  if (
    incident.affectedEntity.organizationId !==
    organizationId
  ) {
    throw new Error("Affected entity not found");
  }

  const impact = await analyzeImpact(
    incident.affectedEntityId,
  );

  if (!impact) {
    throw new Error("Affected entity not found");
  }

  return {
    incident: {
      id: incident.id,
      organizationId: incident.organizationId,
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      status: incident.status,
      createdAt: incident.createdAt,
      updatedAt: incident.updatedAt,
      resolvedAt: incident.resolvedAt,
    },

    affectedEntity: incident.affectedEntity,

    impact,
  };
}