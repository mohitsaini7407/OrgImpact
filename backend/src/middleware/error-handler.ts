import { NextFunction, Request, Response } from "express";
import { Prisma } from "../generated/prisma/client.js";

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (process.env.NODE_ENV === "production") {
    console.error("Unhandled API error:", error instanceof Prisma.PrismaClientKnownRequestError ? { code: error.code } : error instanceof Error ? error.name : "UnknownError");
  } else {
    console.error(error);
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError
  ) {
    if (error.code === "P2002") {
      const target = error.meta?.target;
      if (Array.isArray(target) && target.includes("organizationId") && target.includes("name")) {
        res.status(409).json({
          error: "An entity type with this name already exists in this organization",
        });
        return;
      }
      res.status(409).json({
        error: "Resource already exists",
      });
      return;
    }

    if (error.code === "P2025") {
      res.status(404).json({
        error: "Resource not found",
      });
      return;
    }

    if (error.code === "P2003") {
      res.status(400).json({
        error: "Related resource does not exist",
      });
      return;
    }
  }

  if (error instanceof Error) {
    const knownErrors: Record<string, number> = {
      "Entity not found": 404,
      "Entity type not found": 404,
      "An entity type with this name already exists in this organization": 409,
      "Entity type is assigned to entities and cannot be deleted": 409,
      "Source entity not found": 404,
      "Target entity not found": 404,
      "Relationship not found": 404,
      "Team not found": 404,
      "User not found": 404,
      "Organization not found": 404,
      "User must belong to the same organization as the team": 400,
      "Invalid membership role. Allowed roles: OWNER, ADMIN, MEMBER": 400,
      "Source and target entities cannot be the same": 400,
      "Source and target entities must belong to the same organization": 400,
      "User is already a member of this organization": 409,
      "You are already a member of this organization": 409,
      "An account with this email already exists.": 409,
      "Invalid organization join code": 404,
      "Your join request is already pending": 409,
      "Join request not found": 404,
      "Join request has already been reviewed": 409,
      "You cannot start a direct conversation with yourself": 400,
      "Both people must belong to this organization": 403,
      "Team channel not found": 404,
      "Message identifier was already used": 409,
    };

    const statusCode = knownErrors[error.message];

    if (statusCode) {
      res.status(statusCode).json({
        error: error.message,
      });
      return;
    }
  }

  res.status(500).json({
    error: "Internal server error",
  });
}
