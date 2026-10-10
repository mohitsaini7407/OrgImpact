import { Request, Response } from "express";
import { analyzeImpact } from "../services/impact.service.js";

export async function analyzeImpactController(
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

  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(403).json({ error: "Organization access is required" });
    return;
  }

  const result = await analyzeImpact(entityId, organizationId);

  if (!result) {
    res.status(404).json({
      error: "Entity not found",
    });
    return;
  }

  res.status(200).json(result);
}
