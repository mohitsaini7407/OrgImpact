
import type { Request, Response } from "express";
import {
  registerUser,
  getUserById,
  loginUser,
  updateUserName,
} from "../services/auth.service.js";

function sendControllerError(
  res: Response,
  error: unknown,
  fallback: string,
) {
  console.error(`${fallback}:`, error);

  const message =
    error instanceof Error ? error.message : fallback;

  const errorCode = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
  const status = message.includes("already exists") || errorCode === "P2002" ? 409 : 500;

  res.status(status).json({ error: message });
}

export async function registerController(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body;
    const result = await registerUser(name, email, password);
    res.status(201).json(result);
  } catch (error) {
    sendControllerError(res, error, "Registration failed");
  }
}

export async function loginController(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const result = await loginUser(email, password);

    if (result && "error" in result) {
      res.status(404).json({ error: result.error });
      return;
    }

    if (!result) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    sendControllerError(res, error, "Login failed");
  }
}

export async function meController(req: Request, res: Response) {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const user = await getUserById(userId);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    sendControllerError(res, error, "Unable to load user");
  }
}

export async function updateProfileController(req: Request, res: Response) {
  if (!req.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const user = await updateUserName(req.userId, req.body.name);
    res.status(200).json(user);
  } catch (error) {
    sendControllerError(res, error, "Unable to update profile");
  }
}
