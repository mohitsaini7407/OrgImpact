import type { NextFunction, Request, Response } from "express";
import crypto from "node:crypto";
import { redisClient } from "../lib/redis.js";

export function authRateLimit(limit: number, windowSeconds = 900) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const source = req.ip || req.socket.remoteAddress || "unknown";
      const sourceHash = crypto.createHash("sha256").update(source).digest("hex");
      const key = `security:auth:${req.path}:${sourceHash}`;
      const count = await redisClient.incr(key);
      if (count === 1) await redisClient.expire(key, windowSeconds);
      if (count > limit) {
        res.setHeader("Retry-After", String(windowSeconds));
        res.status(429).json({ error: "Too many attempts. Please try again later." });
        return;
      }
      next();
    } catch {
      res.status(503).json({ error: "Authentication is temporarily unavailable" });
    }
  };
}
