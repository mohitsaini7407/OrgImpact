import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export async function requireTeamOrganizationMember(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userId = req.userId;

  const teamId =
    typeof req.params.teamId === "string"
      ? req.params.teamId
      : typeof req.body.teamId === "string"
        ? req.body.teamId
        : undefined;

  if (!userId) {
    res.status(401).json({
      error: "Authentication required",
    });
    return;
  }

  if (!teamId) {
    res.status(400).json({
      error: "Team ID is required",
    });
    return;
  }

  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },
    select: {
      id: true,
      organizationId: true,
    },
  });

  if (!team) {
    res.status(404).json({
      error: "Team not found",
    });
    return;
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: team.organizationId,
      },
    },
  });

  if (!membership) {
    res.status(404).json({
      error: "Team not found",
    });
    return;
  }

  req.organizationId = team.organizationId;
  req.organizationRole = membership.role;

  next();
}
