import { Request, Response } from "express";

import {
  createMembership,
  getOrganizationMembers,
} from "../services/membership.service.js";

export async function createMembershipController(
  req: Request,
  res: Response,
) {
  const { email, organizationId } = req.body;

  if (!req.organizationRole) {
    res.status(403).json({
      error: "Organization role not found",
    });
    return;
  }

  if (req.organizationRole !== "OWNER") {
    res.status(403).json({ error: "Only an organization owner can add members" });
    return;
  }

  try {
    const membership = await createMembership(email, organizationId);
    res.status(201).json(membership);
  } catch (error) {
    if (error instanceof Error && error.message === "User not found") {
      res.status(404).json({ error: "No OrgImpact account exists with this email address." });
      return;
    }
    throw error;
  }
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
