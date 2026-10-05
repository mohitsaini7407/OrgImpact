import { Request, Response } from "express";
import {
  createOrganization,
  getOrganizations,
} from "../services/organization.service.js";

export async function createOrganizationController(
  req: Request,
  res: Response,
) {
  const { name, slug } = req.body;

  const organization = await createOrganization(name, slug);

  res.status(201).json(organization);
}

export async function getOrganizationsController(
  _req: Request,
  res: Response,
) {
  const organizations = await getOrganizations();

  res.status(200).json(organizations);
}
