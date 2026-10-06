import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export async function requireEntityOrganizationMember(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userId = req.userId;
  const entityId = req.params.entityId;

  if (!userId) {
    res.status(401).json({
      error: "Authentication required",
    });
    return;
  }

  if (typeof entityId !== "string") {
    res.status(400).json({
      error: "Entity ID is required",
    });
    return;
  }

  const entity = await prisma.entity.findUnique({
    where: {
      id: entityId,
    },
    select: {
      id: true,
      organizationId: true,
    },
  });

  if (!entity) {
    res.status(404).json({
      error: "Entity not found",
    });
    return;
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: entity.organizationId,
      },
    },
  });

  if (!membership) {
    res.status(404).json({
      error: "Entity not found",
    });
    return;
  }

  req.organizationId = entity.organizationId;
  req.organizationRole = membership.role;

  next();
}
