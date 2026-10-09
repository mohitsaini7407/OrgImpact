import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export async function requireEntityTypeOrganizationMember(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userId = req.userId;
  const entityTypeId = req.params.entityTypeId;

  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (typeof entityTypeId !== "string") {
    res.status(400).json({ error: "Entity type ID is required" });
    return;
  }

  const entityType = await prisma.entityType.findUnique({
    where: { id: entityTypeId },
    select: { organizationId: true },
  });

  if (!entityType) {
    res.status(404).json({ error: "Entity type not found" });
    return;
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: entityType.organizationId,
      },
    },
    select: { role: true },
  });

  if (!membership) {
    res.status(403).json({ error: "You are not a member of this organization" });
    return;
  }

  req.organizationId = entityType.organizationId;
  req.organizationRole = membership.role;
  next();
}

export async function requireEntityTypeManager(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userId = req.userId;
  const organizationId = req.organizationId;
  if (!userId || !organizationId) {
    res.status(403).json({ error: "Organization access is required" });
    return;
  }

  if (req.organizationRole === "OWNER" || req.organizationRole === "ADMIN") {
    next();
    return;
  }

  const organization = await prisma.organization.findFirst({
    where: { id: organizationId, createdById: userId },
    select: { id: true },
  });
  if (!organization) {
    res.status(403).json({ error: "You do not have permission to manage entity types" });
    return;
  }
  next();
}
