import { Request, Response } from "express";
import {
  createOrganization,
  getOrganizations,
} from "../services/organization.service.js";

export async function createOrganizationController(
  req: Request,
  res: Response,
) {
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({
      error: "Authentication required",
    });
    return;
  }

  const { name, slug } = req.body;

  const organization = await createOrganization(
    name,
    slug,
    userId,
  );

  res.status(201).json(organization);
}

export async function getOrganizationsController(
  req: Request,
  res: Response,
) {
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({
      error: "Authentication required",
    });
    return;
  }

  const organizations = await getOrganizations(userId);

  res.status(200).json(organizations);
}
