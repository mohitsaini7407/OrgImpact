import { Request, Response } from "express";
import {
  createEntityType,
  deleteEntityType,
  getEntityTypes,
  updateEntityType,
} from "../services/entity-type.service.js";

export async function getEntityTypesController(
  req: Request,
  res: Response,
) {
  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(400).json({ error: "Organization ID is required" });
    return;
  }
  const entityTypes = await getEntityTypes(organizationId);

  res.status(200).json(entityTypes);
}

export async function createEntityTypeController(req: Request, res: Response) {
  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(400).json({ error: "Organization ID is required" });
    return;
  }
  const entityType = await createEntityType(organizationId, req.body.name, req.body.color);
  res.status(201).json(entityType);
}

export async function updateEntityTypeController(req: Request, res: Response) {
  const entityTypeId = req.params.entityTypeId;
  if (typeof entityTypeId !== "string" || !req.organizationId) {
    res.status(400).json({ error: "Entity type ID is required" });
    return;
  }
  const entityType = await updateEntityType(entityTypeId, req.organizationId, req.body);
  res.status(200).json(entityType);
}

export async function deleteEntityTypeController(req: Request, res: Response) {
  const entityTypeId = req.params.entityTypeId;
  if (typeof entityTypeId !== "string" || !req.organizationId) {
    res.status(400).json({ error: "Entity type ID is required" });
    return;
  }
  await deleteEntityType(entityTypeId, req.organizationId);
  res.status(204).send();
}