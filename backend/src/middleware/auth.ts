import {
  NextFunction,
  Request,
  Response,
} from "express";
import jwt from "jsonwebtoken";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }

  return secret;
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authorization =
    req.headers.authorization;

  if (!authorization) {
    res.status(401).json({
      error: "Authentication required",
    });

    return;
  }

  const [scheme, token, extra] =
    authorization.split(" ");

  if (
    scheme !== "Bearer" ||
    !token ||
    extra
  ) {
    res.status(401).json({
      error: "Invalid authorization header",
    });

    return;
  }

  try {
    const payload = jwt.verify(
      token,
      getJwtSecret(),
      { algorithms: ["HS256"] },
    );
    if (typeof payload === "string" || typeof payload.userId !== "string" || !payload.userId) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    req.userId = payload.userId;

    next();
  } catch {
    res.status(401).json({
      error: "Invalid or expired token",
    });
  }
}
