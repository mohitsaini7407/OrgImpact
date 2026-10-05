import { Request, Response } from "express";

import {
  createMembership,
  getOrganizationMembers,
} from "../services/membership.service.js";

export async function createMembershipController(
  req: Request,
  res: Response,
) {
  const { userId, organizationId, role } = req.body;

  if (!req.organizationRole) {
    res.status(403).json({
      error: "Organization role not found",
    });
    return;
  }

  if (role === "OWNER" && req.organizationRole !== "OWNER") {
    res.status(403).json({
      error: "Only an organization owner can assign the OWNER role",
    });
    return;
  }

  const membership = await createMembership(
    userId,
    organizationId,
    role,
  );

  res.status(201).json(membership);
}

export async function getOrganizationMembersController(
  req: Request,
  res: Response,
) {
  const organizationId = req.params.organizationId;

  if (typeof organizationId !== "string") {
    res.status(400).json({
      message: "Invalid organizationId",
    });
    return;
  }

  const members = await getOrganizationMembers(organizationId);

  res.status(200).json(members);
}
