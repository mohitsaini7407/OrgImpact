import { Request, Response } from "express";

import {
  createEntity,
  deleteEntity,
  getEntityById,
  getOrganizationEntities,
  updateEntity,
} from "../services/entity.service.js";

export async function createEntityController(
  req: Request,
  res: Response,
) {
  const {
    organizationId,
    entityTypeId,
    name,
    description,
    criticality,
  } = req.body;

  const entity = await createEntity(
    organizationId,
    entityTypeId,
    name,
    description,
    criticality,
  );

  res.status(201).json(entity);
}

export async function getOrganizationEntitiesController(
  req: Request,
  res: Response,
) {
  const organizationId = req.params.organizationId;

  if (!organizationId || Array.isArray(organizationId)) {
    res.status(400).json({
      error: "Organization ID is required",
    });
    return;
  }

  const entities = await getOrganizationEntities(
    organizationId,
  );

  res.status(200).json(entities);
}

export async function getEntityByIdController(
  req: Request,
  res: Response,
) {
  const entityId = req.params.entityId;

  if (!entityId || Array.isArray(entityId)) {
    res.status(400).json({
      error: "Entity ID is required",
    });
    return;
  }

  const entity = await getEntityById(entityId);

  if (!entity) {
    res.status(404).json({
      error: "Entity not found",
    });
    return;
  }

  res.status(200).json(entity);
}

export async function updateEntityController(
  req: Request,
  res: Response,
) {
  const entityId = req.params.entityId;

  if (!entityId || Array.isArray(entityId)) {
    res.status(400).json({
      error: "Entity ID is required",
    });
    return;
  }

  const entity = await updateEntity(
    entityId,
    req.organizationId!,
    req.body,
  );

  res.status(200).json(entity);
}

export async function deleteEntityController(
  req: Request,
  res: Response,
) {
  const entityId = req.params.entityId;

  if (!entityId || Array.isArray(entityId)) {
    res.status(400).json({
      error: "Entity ID is required",
    });
    return;
  }

  const result = await deleteEntity(entityId);

  res.status(200).json(result);
}