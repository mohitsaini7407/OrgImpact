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
import { requireRole } from "../middleware/require-role.js";
import { createTeamMemberSchema } from "./team-member.schema.js";

const router = Router();

const updateTeamMemberSchema = z
  .object({
    role: z.enum(["MEMBER", "LEAD"]),
  })
  .strict();

async function requireTeamManager(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const teamMemberId = req.params.teamMemberId;

    const target = await prisma.teamMember.findUnique({
      where: { id: teamMemberId },
      include: { team: true },
    });

    if (!target) {
      res.status(404).json({ error: "Team member not found" });
      return;
    }

    const requesterMembership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: req.userId!,
          organizationId: target.team.organizationId,
        },
      },
    });

    if (!requesterMembership) {
      res.status(404).json({ error: "Team member not found" });
      return;
    }

    const requesterTeamMembership = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: req.userId!,
          teamId: target.teamId,
        },
      },
    });

    const isOrgManager = ["OWNER", "ADMIN"].includes(requesterMembership.role);
    const isTeamLead = requesterTeamMembership?.role === "LEAD";

    if (!isOrgManager && !isTeamLead) {
      res.status(403).json({ error: "Insufficient permissions to manage this team" });
      return;
    }

    if (
      requesterMembership.role === "ADMIN" &&
      ["LEAD"].includes(target.role)
    ) {
      res.status(403).json({ error: "ADMIN can manage team members but cannot modify a team lead" });
      return;
    }

    if (isTeamLead && !isOrgManager && target.role !== "MEMBER") {
      res.status(403).json({ error: "Team leads can only manage team members" });
      return;
    }

    req.organizationId = target.team.organizationId;
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
  requireRole("OWNER", "ADMIN"),
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
    const role = req.body.role as "MEMBER" | "LEAD";

    const target = await prisma.teamMember.findUnique({
      where: { id: teamMemberId },
      include: { team: true },
    });

    if (!target) {
      res.status(404).json({ error: "Team member not found" });
      return;
    }

    const requesterMembership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: req.userId!,
          organizationId: target.team.organizationId,
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

    if (requesterMembership?.role === "ADMIN" && role === "LEAD") {
      res.status(403).json({ error: "Only an organization owner can assign the LEAD role" });
      return;
    }

    if (requesterTeamMembership?.role === "LEAD" && requesterMembership?.role === "MEMBER" && role !== "MEMBER") {
      res.status(403).json({ error: "Team leads cannot promote members" });
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

    const target = await prisma.teamMember.findUnique({
      where: { id: teamMemberId },
      include: { team: true },
    });

    if (!target) {
      res.status(404).json({ error: "Team member not found" });
      return;
    }

    const requesterMembership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: req.userId!,
          organizationId: target.team.organizationId,
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
