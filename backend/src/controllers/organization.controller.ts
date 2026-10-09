import { Request, Response } from "express";
import {
  createOrganization,
  getOrganizations,
  requestOrganizationMembership,
  getMyJoinRequests,
  getOrganizationJoinRequests,
  reviewOrganizationJoinRequest,
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


export async function requestJoinController(req: Request, res: Response) {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: "Authentication required" }); return; }
  const result = await requestOrganizationMembership(userId, req.body.joinCode);
  res.status(201).json(result);
}

export async function myJoinRequestsController(req: Request, res: Response) {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: "Authentication required" }); return; }
  res.status(200).json(await getMyJoinRequests(userId));
}

export async function organizationJoinRequestsController(req: Request, res: Response) {
  const organizationId = req.params.organizationId;
  if (typeof organizationId !== "string" || organizationId.length === 0) {
    res.status(400).json({ error: "Organization ID is required" });
    return;
  }
  res.status(200).json(await getOrganizationJoinRequests(organizationId));
}

export async function reviewJoinRequestController(req: Request, res: Response) {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: "Authentication required" }); return; }

  const organizationId = req.params.organizationId;
  const requestId = req.params.requestId;
  if (typeof organizationId !== "string" || typeof requestId !== "string") {
    res.status(400).json({ error: "Organization ID and request ID are required" });
    return;
  }

  const result = await reviewOrganizationJoinRequest(
    organizationId,
    requestId,
    userId,
    req.body.decision,
  );
  res.status(200).json(result);
}
