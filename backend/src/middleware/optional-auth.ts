import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;
  if (!authorization) return next();
  const [scheme, token, extra] = authorization.split(" ");
  if (scheme !== "Bearer" || !token || extra) {
    res.status(401).json({ error: "Invalid authorization header" });
    return;
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(503).json({ error: "Authentication is unavailable" });
    return;
  }
  try {
    const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
    if (typeof payload === "string" || typeof payload.userId !== "string" || !payload.userId) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
