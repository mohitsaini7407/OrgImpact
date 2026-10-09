import type { Request, Response } from "express";
import {
  acceptOrganizationInvitation,
  createOrganizationInvitation,
  getInvitationByToken,
} from "../services/invitation.service.js";

function sendInvitationError(error: unknown, res: Response) {
  if (!(error instanceof Error)) {
    res.status(500).json({ error: "Unable to process invitation" });
    return;
  }

  const status =
    error.message === "Sign in to the invited account to accept this invitation"
      ? 401
      : error.message === "User is already a member of this organization"
        ? 409
        : error.message === "Organization not found"
          ? 404
          : error.message.startsWith("You do not have permission")
            ? 403
            : 400;

  res.status(status).json({ error: error.message });
}

export async function createInvitationController(req: Request, res: Response) {
  try {
    const result = await createOrganizationInvitation(
      req.body.email,
      req.body.organizationId,
      req.body.role,
      req.userId!,
    );

    res.status(201).json(result);
  } catch (error) {
    sendInvitationError(error, res);
  }
}

export async function getInvitationController(req: Request, res: Response) {
  try {
    const token = req.params.token;
    if (typeof token !== "string" || token.length === 0) {
      res.status(400).json({ error: "Invitation token is required" });
      return;
    }

    const result = await getInvitationByToken(token);
    res.status(200).json(result);
  } catch (error) {
    sendInvitationError(error, res);
  }
}

export async function acceptInvitationController(req: Request, res: Response) {
  try {
    const token = req.params.token;
    if (typeof token !== "string" || token.length === 0) {
      res.status(400).json({ error: "Invitation token is required" });
      return;
    }

    const result = await acceptOrganizationInvitation(
      token,
      req.body.name,
      req.body.password,
      req.userId,
    );

    res.status(200).json({
      message: "Invitation accepted successfully",
      ...result,
    });
  } catch (error) {
    sendInvitationError(error, res);
  }
}
