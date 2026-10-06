import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";

export async function requireIncidentOrganizationMember(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const incidentId = req.params.incidentId;

    if (!incidentId || Array.isArray(incidentId)) {
      res.status(400).json({
        error: "Incident ID is required",
      });
      return;
    }

    if (!req.userId) {
      res.status(401).json({
        error: "Authentication required",
      });
      return;
    }

    const incident = await prisma.incident.findUnique({
      where: {
        id: incidentId,
      },
      select: {
        organizationId: true,
      },
    });

    if (!incident) {
      res.status(404).json({
        error: "Incident not found",
      });
      return;
    }

    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: req.userId,
          organizationId: incident.organizationId,
        },
      },
    });

    if (!membership) {
        res.status(404).json({
            error: "Incident not found",
        });
        return;
    }

    req.organizationId = incident.organizationId;
    req.organizationRole = membership.role;

    next();
  } catch (error) {
    next(error);
  }
}