import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";

import {
  createTeamMemberController,
  getTeamMembersController,
} from "../controllers/team-member.controller.js";
import { prisma } from "../lib/prisma.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";
import { requireTeamOrganizationMember } from "../middleware/team-organization-auth.js";
import { createTeamMemberSchema } from "./team-member.schema.js";

const router = Router();

const updateTeamMemberSchema = z
  .object({
    role: z.enum(["MEMBER", "LEAD"]),
  })
  .strict();

async function requireCreatorForLead(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.body.role !== "LEAD") {
    next();
    return;
  }

  if (!req.organizationId || !req.userId) {
    res.status(403).json({ error: "Organization context is required" });
    return;
  }

  const organization = await prisma.organization.findUnique({
    where: { id: req.organizationId },
    select: { createdById: true },
  });
  const requesterIsCreator = organization?.createdById === req.userId;
  const requesterIsOwner = req.organizationRole === "OWNER";
  const teamId = req.body.teamId;
  const requesterIsTeamLead = typeof teamId === "string" && Boolean(await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId: req.userId, teamId } },
    select: { id: true, role: true },
  }).then((membership) => membership?.role === "LEAD"));

  if (!requesterIsCreator && !requesterIsOwner && !requesterIsTeamLead) {
    res.status(403).json({ error: "Only the creator, an owner, or a team lead can assign the team lead title" });
    return;
  }

  next();
}

async function requireTeamAssignmentManager(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.userId || !req.organizationId) {
      res.status(403).json({ error: "Organization context is required" });
      return;
    }

    if (["OWNER", "ADMIN"].includes(req.organizationRole ?? "")) {
      next();
      return;
    }

    const organization = await prisma.organization.findUnique({
      where: { id: req.organizationId },
      select: { createdById: true },
    });
    if (organization?.createdById === req.userId) {
      next();
      return;
    }

    const teamId = req.body.teamId;
    if (typeof teamId === "string") {
      const teamMembership = await prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: req.userId, teamId } },
        select: { role: true },
      });
      if (teamMembership?.role === "LEAD") {
        next();
        return;
      }
    }

    res.status(403).json({ error: "Insufficient permissions to manage this team" });
  } catch (error) {
    next(error);
  }
}

async function requireTeamManager(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const teamMemberId = req.params.teamMemberId;
    if (typeof teamMemberId !== "string" || teamMemberId.length === 0) {
      res.status(400).json({ error: "Team member ID is required" });
      return;
    }

    const target = await prisma.teamMember.findUnique({
      where: { id: teamMemberId },
    });

    if (!target) {
      res.status(404).json({ error: "Team member not found" });
      return;
    }

    const team = await prisma.team.findUnique({ where: { id: target.teamId } });
    if (!team) {
      res.status(404).json({ error: "Team not found" });
      return;
    }

    const requesterMembership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: req.userId,
          organizationId: team.organizationId,
        },
      },
    });

    const organization = await prisma.organization.findUnique({
      where: { id: team.organizationId },
      select: { createdById: true },
    });
    const requesterIsCreator = organization?.createdById === req.userId;

    if (!requesterMembership) {
      res.status(404).json({ error: "Team member not found" });
      return;
    }

    const requesterTeamMembership = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: req.userId,
          teamId: target.teamId,
        },
      },
    });

    const requesterIsOwner = requesterMembership.role === "OWNER";
    const isTeamLead = requesterTeamMembership?.role === "LEAD";

    if (!requesterIsCreator && !requesterIsOwner && !isTeamLead) {
      res.status(403).json({ error: "Insufficient permissions to manage this team" });
      return;
    }

    if (target.userId === req.userId) {
      res.status(400).json({ error: "You cannot modify your own team membership" });
      return;
    }

    const targetOrganizationMembership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: target.userId,
          organizationId: team.organizationId,
        },
      },
      select: { role: true },
    });
    const targetIsCreator = organization?.createdById === target.userId;
    const targetIsOwner = targetOrganizationMembership?.role === "OWNER";

    if (!requesterIsCreator && (targetIsCreator || targetIsOwner)) {
      res.status(403).json({ error: "Only the organization creator can manage a creator or owner" });
      return;
    }

    if (isTeamLead && !requesterIsCreator && target.role === "LEAD") {
      res.status(403).json({ error: "A team lead cannot modify another team lead" });
      return;
    }

    req.organizationId = team.organizationId;
    req.organizationRole = requesterMembership.role;
    next();
  } catch (error) {
    next(error);
  }
}

router.post(
  "/",
  authenticate,
  validate(createTeamMemberSchema),
  requireTeamOrganizationMember,
  asyncHandler(requireCreatorForLead),
  asyncHandler(requireTeamAssignmentManager),
  asyncHandler(createTeamMemberController),
);

router.get(
  "/team/:teamId",
  authenticate,
  requireTeamOrganizationMember,
  asyncHandler(getTeamMembersController),
);

router.patch(
  "/:teamMemberId",
  authenticate,
  validate(updateTeamMemberSchema),
  asyncHandler(requireTeamManager),
  asyncHandler(async (req, res) => {
    const teamMemberId = req.params.teamMemberId;
    if (typeof teamMemberId !== "string" || teamMemberId.length === 0) {
      res.status(400).json({ error: "Team member ID is required" });
      return;
    }
    const role = req.body.role as "MEMBER" | "LEAD";

    const target = await prisma.teamMember.findUnique({
      where: { id: teamMemberId },
    });

    if (!target) {
      res.status(404).json({ error: "Team member not found" });
      return;
    }

    if (target.userId === req.userId) {
      res.status(400).json({ error: "You cannot modify your own team membership" });
      return;
    }

    const updated = await prisma.teamMember.update({
      where: { id: teamMemberId },
      data: { role },
      select: {
        id: true,
        userId: true,
        teamId: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(200).json(updated);
  }),
);

router.delete(
  "/:teamMemberId",
  authenticate,
  asyncHandler(requireTeamManager),
  asyncHandler(async (req, res) => {
    const teamMemberId = req.params.teamMemberId;
    if (typeof teamMemberId !== "string" || teamMemberId.length === 0) {
      res.status(400).json({ error: "Team member ID is required" });
      return;
    }

    const target = await prisma.teamMember.findUnique({
      where: { id: teamMemberId },
    });

    if (!target) {
      res.status(404).json({ error: "Team member not found" });
      return;
    }

    const team = await prisma.team.findUnique({ where: { id: target.teamId } });
    if (!team) {
      res.status(404).json({ error: "Team not found" });
      return;
    }

    const requesterMembership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: req.userId!,
          organizationId: team.organizationId,
        },
      },
    });

    const requesterTeamMembership = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: req.userId!,
          teamId: target.teamId,
        },
      },
    });

    if (target.userId === req.userId) {
      res.status(400).json({ error: "You cannot remove yourself from a team" });
      return;
    }

    if (requesterMembership?.role === "ADMIN" && target.role === "LEAD") {
      res.status(403).json({ error: "ADMIN cannot remove a team lead" });
      return;
    }

    if (requesterTeamMembership?.role === "LEAD" && requesterMembership?.role === "MEMBER" && target.role !== "MEMBER") {
      res.status(403).json({ error: "Team leads can only remove team members" });
      return;
    }

    await prisma.teamMember.delete({ where: { id: teamMemberId } });
    res.status(204).send();
  }),
);

export default router;
