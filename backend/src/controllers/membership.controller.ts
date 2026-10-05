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
    return res.status(400).json({ message: "Invalid organizationId" });
  }

  const members = await getOrganizationMembers(organizationId);

  res.status(200).json(members);
}