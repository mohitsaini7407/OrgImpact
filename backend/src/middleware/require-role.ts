import { NextFunction, Request, Response } from "express";

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.organizationRole;

    if (!role) {
      res.status(403).json({
        error: "Organization role not found",
      });
      return;
    }

    if (!allowedRoles.includes(role)) {
      res.status(403).json({
        error: "You do not have permission to perform this action",
      });
      return;
    }

    next();
  };
}
