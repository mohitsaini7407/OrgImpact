import { Request, Response } from "express";
import {
  createTeam,
  deleteTeam,
  getOrganizationTeams,
  getTeamById,
  updateTeam,
} from "../services/team.service.js";

export async function createTeamController(
  req: Request,
  res: Response,
) {
  const { organizationId, name, slug } = req.body;

  const team = await createTeam(
    organizationId,
    name,
    slug,
  );

  res.status(201).json(team);
}

export async function getOrganizationTeamsController(
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

  const teams = await getOrganizationTeams(
    organizationId,
  );

  res.status(200).json(teams);
}

export async function getTeamByIdController(
  req: Request,
  res: Response,
) {
  const teamId = req.params.teamId;

  if (typeof teamId !== "string") {
    res.status(400).json({
      error: "Invalid teamId",
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

  const team = await getTeamById(
    teamId,
    organizationId,
  );

  if (!team) {
    res.status(404).json({
      error: "Team not found",
    });
    return;
  }

  res.status(200).json(team);
}

export async function updateTeamController(req: Request, res: Response) {
  const teamId = req.params.teamId;
  const organizationId = req.organizationId;
  if (typeof teamId !== "string" || !organizationId) {
    res.status(400).json({ error: "Team and organization context are required" });
    return;
  }

  const { name, slug } = req.body;
  const team = await updateTeam(teamId, organizationId, name, slug);
  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  res.status(200).json(team);
}

export async function deleteTeamController(req: Request, res: Response) {
  const teamId = req.params.teamId;
  const organizationId = req.organizationId;
  if (typeof teamId !== "string" || !organizationId) {
    res.status(400).json({ error: "Team and organization context are required" });
    return;
  }

  const deleted = await deleteTeam(teamId, organizationId);
  if (!deleted) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  res.status(204).send();
}
