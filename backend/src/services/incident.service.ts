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
  const entity = await prisma.entity.findUnique({ where: { id: affectedEntityId } });
  if (!entity) throw new Error("Affected entity not found");
  if (entity.organizationId !== organizationId) {
    throw new Error("Affected entity must belong to the same organization");
  }

  const incident = await prisma.$transaction(async (transaction) => {
    const createdIncident = await transaction.incident.create({
      data: {
        organizationId,
        affectedEntityId,
        createdById,
        title,
        description: description ?? null,
        severity,
      },
      include: {
        affectedEntity: { include: { entityType: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        investigatedBy: { select: { id: true, name: true, email: true } },
        resolvedBy: { select: { id: true, name: true, email: true } },
      },
    });
    const recipients = await transaction.membership.findMany({
      where: { organizationId, userId: { not: createdById } },
      select: { userId: true },
    });
    if (recipients.length > 0) {
      await transaction.notification.createMany({
        data: recipients.map(({ userId }) => ({
          recipientId: userId,
          organizationId,
          incidentId: createdIncident.id,
          type: "INCIDENT_CREATED",
          title: "New incident reported",
          message: `${createdIncident.createdBy.email} created incident - ${createdIncident.title}`,
        })),
      });
    }
    return createdIncident;
  });

  await publishRealtimeEvent("INCIDENT_CREATED", organizationId, incident);
  await publishRealtimeEvent("NOTIFICATIONS_UPDATED", organizationId, { organizationId });
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
      investigatedBy: { select: { id: true, name: true, email: true } },
      resolvedBy: { select: { id: true, name: true, email: true } },
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
      investigatedBy: { select: { id: true, name: true, email: true } },
      resolvedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function updateIncident(
  incidentId: string,
  organizationId: string,
  updatedById: string,
  data: {
    title?: string;
    description?: string | null;
    severity?: string;
    status?: string;
  },
) {
  const result = await prisma.$transaction(async (transaction) => {
    const existingIncident = await transaction.incident.findFirst({
      where: { id: incidentId, organizationId },
    });
    if (!existingIncident) throw new Error("Incident not found");

    const membership = await transaction.membership.findUnique({
      where: {
        userId_organizationId: { userId: updatedById, organizationId },
      },
      select: { role: true },
    });
    if (!membership) throw new Error("Incident not found");

    const isPrivileged = membership.role === "OWNER" || membership.role === "ADMIN";
    const isStatusOnlyUpdate = Object.keys(data).length === 1 && data.status !== undefined;
    if (!isPrivileged && !isStatusOnlyUpdate) {
      throw new Error("You do not have permission to perform this action");
    }

    const canChangeCurrentStatus =
      existingIncident.status === "OPEN" ||
      existingIncident.createdById === updatedById ||
      (existingIncident.status === "INVESTIGATING" && existingIncident.investigatedById === updatedById) ||
      (existingIncident.status === "RESOLVED" && existingIncident.resolvedById === updatedById);
    if (!isPrivileged && !canChangeCurrentStatus) {
      throw new Error("You do not have permission to change this incident status");
    }

    const updateData: {
      title?: string;
      description?: string | null;
      severity?: string;
      status?: string;
      resolvedAt?: Date | null;
      investigatedById?: string | null;
      resolvedById?: string | null;
    } = { ...data };
    const statusChanged = data.status !== undefined && data.status !== existingIncident.status;
    if (statusChanged && data.status === "INVESTIGATING") {
      updateData.investigatedById = updatedById;
      updateData.resolvedById = null;
    } else if (statusChanged && data.status === "RESOLVED") {
      updateData.resolvedById = updatedById;
    } else if (statusChanged && data.status === "OPEN") {
      updateData.investigatedById = null;
      updateData.resolvedById = null;
    }
    if (data.status === "RESOLVED" && existingIncident.status !== "RESOLVED") {
      updateData.resolvedAt = new Date();
    } else if (data.status && data.status !== "RESOLVED" && existingIncident.status === "RESOLVED") {
      updateData.resolvedAt = null;
    }

    const include = {
      affectedEntity: { include: { entityType: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      investigatedBy: { select: { id: true, name: true, email: true } },
      resolvedBy: { select: { id: true, name: true, email: true } },
    } as const;
    const incident = isPrivileged
      ? await transaction.incident.update({
          where: { id: incidentId },
          data: updateData,
          include,
        })
      : await (async () => {
          const updateResult = await transaction.incident.updateMany({
            where: {
              id: incidentId,
              organizationId,
              status: existingIncident.status,
              OR: [
                { status: "OPEN" },
                { createdById: updatedById },
                { status: "INVESTIGATING", investigatedById: updatedById },
                { status: "RESOLVED", resolvedById: updatedById },
              ],
            },
            data: updateData,
          });
          if (updateResult.count !== 1) {
            throw new Error("You do not have permission to change this incident status");
          }
          return transaction.incident.findFirstOrThrow({
            where: { id: incidentId, organizationId },
            include,
          });
        })();
    if (statusChanged) {
      const updater = await transaction.user.findUnique({ where: { id: updatedById }, select: { email: true } });
      const statusLabel = incident.status.charAt(0) + incident.status.slice(1).toLowerCase();
      const recipients = await transaction.membership.findMany({
        where: { organizationId, userId: { not: updatedById } },
        select: { userId: true },
      });
      if (recipients.length > 0) {
        await transaction.notification.createMany({
          data: recipients.map(({ userId }) => ({
            recipientId: userId,
            organizationId,
            incidentId: incident.id,
            type: "INCIDENT_STATUS_CHANGED",
            title: "Incident status updated",
            message: `${updater?.email ?? "A teammate"} updated status of ${incident.title} to ${statusLabel}`,
          })),
        });
      }
    }
    return { incident, statusChanged };
  });

  await publishRealtimeEvent("INCIDENT_UPDATED", organizationId, result.incident);
  if (result.statusChanged) {
    await publishRealtimeEvent("NOTIFICATIONS_UPDATED", organizationId, { organizationId });
  }
  return result.incident;
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
      investigatedBy: { select: { id: true, name: true, email: true } },
      resolvedBy: { select: { id: true, name: true, email: true } },
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
    organizationId,
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
