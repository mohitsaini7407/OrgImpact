import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export async function requireRelationshipTypeOrganizationMember(req: Request, res: Response, next: NextFunction) {
  const userId = req.userId;
  const relationshipTypeId = req.params.relationshipTypeId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (typeof relationshipTypeId !== "string") {
    res.status(400).json({ error: "Relationship type ID is required" });
    return;
  }

  const relationshipType = await prisma.relationshipType.findUnique({
    where: { id: relationshipTypeId },
    select: { organizationId: true },
  });
  if (!relationshipType) {
    res.status(404).json({ error: "Relationship type not found" });
    return;
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: relationshipType.organizationId } },
    select: { role: true },
  });
  if (!membership) {
    res.status(404).json({ error: "Relationship type not found" });
    return;
  }

  req.organizationId = relationshipType.organizationId;
  req.organizationRole = membership.role;
  next();
}

export async function requireRelationshipTypeManager(req: Request, res: Response, next: NextFunction) {
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
    res.status(403).json({ error: "You do not have permission to manage relationship types" });
    return;
  }
  next();
}
