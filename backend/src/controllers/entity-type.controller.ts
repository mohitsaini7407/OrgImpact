import { Request, Response } from "express";
import {
  createEntityType,
  getEntityTypes,
} from "../services/entity-type.service.js";

export async function createEntityTypeController(req: Request, res: Response) {
  const { name } = req.body;

  const entityType = await createEntityType(name);

  res.status(201).json(entityType);
}

export async function getEntityTypesController(_req: Request, res: Response) {
  const entityTypes = await getEntityTypes();

  res.status(200).json(entityTypes);
}
