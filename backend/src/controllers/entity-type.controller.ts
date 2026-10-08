import { Request, Response } from "express";
import { getEntityTypes } from "../services/entity-type.service.js";

export async function getEntityTypesController(
  _req: Request,
  res: Response,
) {
  const entityTypes = await getEntityTypes();

  res.status(200).json(entityTypes);
}