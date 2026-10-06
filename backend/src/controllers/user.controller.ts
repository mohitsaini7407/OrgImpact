import { Request, Response } from "express";
import { getUsers } from "../services/user.service.js";

export async function getUsersController(
  req: Request,
  res: Response,
) {
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({
      error: "Authentication required",
    });
    return;
  }

  const users = await getUsers(userId);

  res.status(200).json(users);
}