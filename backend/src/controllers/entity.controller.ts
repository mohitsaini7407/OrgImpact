import { Request, Response } from "express";
import {
  createEntity,
  getOrganizationEntities,
  getEntityById,
  updateEntity,
  deleteEntity,
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
  } = req.body;

  const entity = await createEntity(
    organizationId,
    entityTypeId,
    name,
    description,
  );

  res.status(201).json(entity);
}

export async function getOrganizationEntitiesController(
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

  const entities = await getOrganizationEntities(organizationId);

  res.status(200).json(entities);
}

export async function getEntityByIdController(
  req: Request,
  res: Response,
) {
  const entityId = req.params.entityId;

  if (typeof entityId !== "string") {
    res.status(400).json({
      error: "Invalid entityId",
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

  if (typeof entityId !== "string") {
    res.status(400).json({
      error: "Invalid entityId",
    });
    return;
  }

  const existingEntity = await getEntityById(entityId);

  if (!existingEntity) {
    res.status(404).json({
      error: "Entity not found",
    });
    return;
  }

  const { name, description, entityTypeId } = req.body;

  const entity = await updateEntity(entityId, {
    name,
    description,
    entityTypeId,
  });

  res.status(200).json(entity);
}

export async function deleteEntityController(
  req: Request,
  res: Response,
) {
  const entityId = req.params.entityId;

  if (typeof entityId !== "string") {
    res.status(400).json({
      error: "Invalid entityId",
    });
    return;
  }

  const existingEntity = await getEntityById(entityId);

  if (!existingEntity) {
    res.status(404).json({
      error: "Entity not found",
    });
    return;
  }

  await deleteEntity(entityId);

  res.status(204).send();
}
