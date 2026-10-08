import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";

import {
  createMembershipController,
  getOrganizationMembersController,
} from "../controllers/membership.controller.js";
import { prisma } from "../lib/prisma.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";
import { requireOrganizationMember } from "../middleware/organization-auth.js";
import { requireRole } from "../middleware/require-role.js";
import { createMembershipSchema } from "./membership.schema.js";

const router = Router();

const updateMembershipSchema = z
  .object({
    role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
  })
  .strict();

async function requireMembershipManager(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const membershipId = req.params.membershipId;
    const target = await prisma.membership.findUnique({
      where: { id: membershipId },
    });

    if (!target) {
      res.status(404).json({ error: "Membership not found" });
      return;
    }

    const requester = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: req.userId!,
          organizationId: target.organizationId,
        },
      },
    });

    if (!requester) {
      res.status(404).json({ error: "Membership not found" });
      return;
    }

    if (!["OWNER", "ADMIN"].includes(requester.role)) {
      res.status(403).json({ error: "Insufficient permissions to manage organization members" });
      return;
    }

    if (requester.role === "ADMIN" && target.role !== "MEMBER") {
      res.status(403).json({ error: "ADMIN can only manage MEMBER accounts" });
      return;
    }

    if (target.userId === req.userId) {
      res.status(400).json({ error: "You cannot modify your own organization membership" });
      return;
    }

    req.organizationId = target.organizationId;
    req.organizationRole = requester.role;
    next();
  } catch (error) {
    next(error);
  }
}

router.post(
  "/",
  authenticate,
  validate(createMembershipSchema),
  requireOrganizationMember,
  requireRole("OWNER", "ADMIN"),
  asyncHandler(createMembershipController),
);

router.get(
  "/organization/:organizationId",
  authenticate,
  requireOrganizationMember,
  asyncHandler(getOrganizationMembersController),
);

router.patch(
  "/:membershipId",
  authenticate,
  validate(updateMembershipSchema),
  asyncHandler(requireMembershipManager),
  asyncHandler(async (req, res) => {
    const membershipId = req.params.membershipId;
    const role = req.body.role as "OWNER" | "ADMIN" | "MEMBER";

    const target = await prisma.membership.findUnique({
      where: { id: membershipId },
    });

    if (!target) {
      res.status(404).json({ error: "Membership not found" });
      return;
    }

    if (req.organizationRole === "ADMIN" && role !== "MEMBER") {
      res.status(403).json({ error: "ADMIN can only assign the MEMBER role" });
      return;
    }

    if (target.role === "OWNER" && role !== "OWNER") {
      const ownerCount = await prisma.membership.count({
        where: { organizationId: target.organizationId, role: "OWNER" },
      });
      if (ownerCount <= 1) {
        res.status(400).json({ error: "The organization must have at least one OWNER" });
        return;
      }
    }

    const updated = await prisma.membership.update({
      where: { id: membershipId },
      data: { role },
      select: {
        id: true,
        userId: true,
        organizationId: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, createdAt: true } },
      },
    });

    res.status(200).json(updated);
  }),
);

router.delete(
  "/:membershipId",
  authenticate,
  asyncHandler(requireMembershipManager),
  asyncHandler(async (req, res) => {
    const membershipId = req.params.membershipId;
    const target = await prisma.membership.findUnique({
      where: { id: membershipId },
    });

    if (!target) {
      res.status(404).json({ error: "Membership not found" });
      return;
    }

    if (target.role === "OWNER") {
      const ownerCount = await prisma.membership.count({
        where: { organizationId: target.organizationId, role: "OWNER" },
      });
      if (ownerCount <= 1) {
        res.status(400).json({ error: "The organization must have at least one OWNER" });
        return;
      }
    }

    await prisma.membership.delete({ where: { id: membershipId } });
    res.status(204).send();
  }),
);

export default router;
