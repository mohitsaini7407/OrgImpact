import {
  NextFunction,
  Request,
  Response,
} from "express";
import jwt from "jsonwebtoken";

type JwtPayload = {
  userId: string;
  email: string;
};

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

  const [scheme, token] =
    authorization.split(" ");

  if (
    scheme !== "Bearer" ||
    !token
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
    ) as JwtPayload;

    req.userId = payload.userId;

    next();
  } catch {
    res.status(401).json({
      error: "Invalid or expired token",
    });
  }
}
