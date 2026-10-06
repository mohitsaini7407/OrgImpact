import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export async function requireRelationshipOrganizationMember(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userId = req.userId;
  const relationshipId = req.params.relationshipId;

  if (!userId) {
    res.status(401).json({
      error: "Authentication required",
    });
    return;
  }

  if (typeof relationshipId !== "string") {
    res.status(400).json({
      error: "Relationship ID is required",
    });
    return;
  }

  const relationship = await prisma.relationship.findUnique({
    where: {
      id: relationshipId,
    },
    select: {
      id: true,
      organizationId: true,
    },
  });

  if (!relationship) {
    res.status(404).json({
      error: "Relationship not found",
    });
    return;
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: relationship.organizationId,
      },
    },
  });

  if (!membership) {
    res.status(404).json({
      error: "Relationship not found",
    });
    return;
  }

  req.organizationId = relationship.organizationId;
  req.organizationRole = membership.role;

  next();
}
