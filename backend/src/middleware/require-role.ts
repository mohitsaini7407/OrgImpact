import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export function requireRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const role = req.organizationRole;

    if (!role) {
      res.status(403).json({
        error: "Organization role not found",
      });
      return;
    }

    if (allowedRoles.includes(role)) {
      next();
      return;
    }

    const userId = req.userId;
    const organizationId = req.organizationId;
    if (userId && organizationId) {
      const organization = await prisma.organization.findFirst({
        where: { id: organizationId, createdById: userId },
        select: { id: true },
      });
      if (organization) {
        next();
        return;
      }
    }

    res.status(403).json({
      error: "You do not have permission to perform this action",
    });
  };
}
