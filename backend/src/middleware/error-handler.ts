import { Request, Response, NextFunction } from "express";
import { Prisma } from "../generated/prisma/client.js";

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error(error);

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    res.status(409).json({
      error: "Resource already exists",
    });
    return;
  }

  res.status(500).json({
    error: "Internal server error",
  });
}
