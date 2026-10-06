import { Request, Response } from "express";
import {
  createRelationship,
  getOrganizationRelationships,
  deleteRelationship,
} from "../services/relationship.service.js";

export async function createRelationshipController(
  req: Request,
  res: Response,
) {
  const {
    organizationId,
    sourceEntityId,
    targetEntityId,
    relationshipType,
  } = req.body;

  const createdById = req.userId;

  if (!createdById) {
    res.status(401).json({
      error: "Authentication required",
    });
    return;
  }

  const relationship = await createRelationship(
    organizationId,
    sourceEntityId,
    targetEntityId,
    relationshipType,
    createdById,
  );

  res.status(201).json(relationship);
}

export async function getOrganizationRelationshipsController(
  req: Request,
  res: Response,
) {
  const organizationId = req.params.organizationId;

  if (typeof organizationId !== "string") {
    res.status(400).json({
      error: "Invalid organizationId",
    });
    return;
  }

  const relationships =
    await getOrganizationRelationships(organizationId);

  res.status(200).json(relationships);
}

export async function deleteRelationshipController(
  req: Request,
  res: Response,
) {
  const relationshipId = req.params.relationshipId;

  if (typeof relationshipId !== "string") {
    res.status(400).json({
      error: "Invalid relationshipId",
    });
    return;
  }

  const organizationId = req.organizationId;

  if (!organizationId) {
    res.status(403).json({
      error: "Organization context is required",
    });
    return;
  }

  await deleteRelationship(
    relationshipId,
    organizationId,
  );

  res.status(204).send();
}