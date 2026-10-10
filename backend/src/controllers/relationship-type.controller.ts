import { Request, Response } from "express";
import { createRelationshipType, deleteRelationshipType, getRelationshipTypes } from "../services/relationship-type.service.js";

export async function getRelationshipTypesController(req: Request, res: Response) {
  if (!req.organizationId) {
    res.status(400).json({ error: "Organization ID is required" });
    return;
  }
  res.status(200).json(await getRelationshipTypes(req.organizationId));
}

export async function createRelationshipTypeController(req: Request, res: Response) {
  if (!req.organizationId) {
    res.status(400).json({ error: "Organization access is required" });
    return;
  }
  res.status(201).json(await createRelationshipType(req.organizationId, req.body.name));
}

export async function deleteRelationshipTypeController(req: Request, res: Response) {
  const relationshipTypeId = req.params.relationshipTypeId;
  if (typeof relationshipTypeId !== "string" || !req.organizationId) {
    res.status(400).json({ error: "Relationship type ID is required" });
    return;
  }
  await deleteRelationshipType(relationshipTypeId, req.organizationId);
  res.status(204).send();
}
