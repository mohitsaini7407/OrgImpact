import { Request, Response } from "express";

import {
  createIncident,
  deleteIncident,
  getIncidentById,
  getIncidentImpact,
  getOrganizationIncidents,
  updateIncident,
} from "../services/incident.service.js";

export async function createIncidentController(
  req: Request,
  res: Response,
) {
  const {
    organizationId,
    affectedEntityId,
    title,
    description,
    severity,
  } = req.body;

  const incident = await createIncident(
    organizationId,
    affectedEntityId,
    req.userId!,
    title,
    description,
    severity,
  );

  res.status(201).json(incident);
}

export async function getOrganizationIncidentsController(
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

  const incidents = await getOrganizationIncidents(
    organizationId,
  );

  res.status(200).json(incidents);
}

export async function getIncidentController(
  req: Request,
  res: Response,
) {
  const incidentId = req.params.incidentId;

  if (!incidentId || Array.isArray(incidentId)) {
    res.status(400).json({
      error: "Incident ID is required",
    });
    return;
  }

  if (!req.organizationId) {
    res.status(403).json({
      error: "Organization context is required",
    });
    return;
  }

  const incident = await getIncidentById(
    incidentId,
    req.organizationId,
  );

  if (!incident) {
    res.status(404).json({
      error: "Incident not found",
    });
    return;
  }

  res.status(200).json(incident);
}

export async function updateIncidentController(
  req: Request,
  res: Response,
) {
  const incidentId = req.params.incidentId;

  if (!incidentId || Array.isArray(incidentId)) {
    res.status(400).json({
      error: "Incident ID is required",
    });
    return;
  }

  if (!req.organizationId) {
    res.status(403).json({
      error: "Organization context is required",
    });
    return;
  }

  const incident = await updateIncident(
    incidentId,
    req.organizationId,
    req.body,
  );

  res.status(200).json(incident);
}

export async function deleteIncidentController(
  req: Request,
  res: Response,
) {
  const incidentId = req.params.incidentId;

  if (!incidentId || Array.isArray(incidentId)) {
    res.status(400).json({
      error: "Incident ID is required",
    });
    return;
  }

  if (!req.organizationId) {
    res.status(403).json({
      error: "Organization context is required",
    });
    return;
  }

  const result = await deleteIncident(
    incidentId,
    req.organizationId,
  );

  res.status(200).json(result);
}

export async function getIncidentImpactController(
  req: Request,
  res: Response,
) {
  const incidentId = req.params.incidentId;

  if (!incidentId || Array.isArray(incidentId)) {
    res.status(400).json({
      error: "Incident ID is required",
    });
    return;
  }

  if (!req.organizationId) {
    res.status(403).json({
      error: "Organization context is required",
    });
    return;
  }

  const result = await getIncidentImpact(
    incidentId,
    req.organizationId,
  );

  res.status(200).json(result);
}