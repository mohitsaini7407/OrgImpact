import { NextFunction, Request, Response } from "express";
import { Prisma } from "../generated/prisma/client.js";

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error(error);

  if (
    error instanceof Prisma.PrismaClientKnownRequestError
  ) {
    if (error.code === "P2002") {
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