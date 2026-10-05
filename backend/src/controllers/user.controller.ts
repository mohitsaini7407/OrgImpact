import { Request, Response } from "express";
import {
  createUser,
  getUsers,
} from "../services/user.service.js";

export async function createUserController(
  req: Request,
  res: Response,
) {
  const { name, email } = req.body;

  const user = await createUser(name, email);

  res.status(201).json(user);
}

export async function getUsersController(
  _req: Request,
  res: Response,
) {
  const users = await getUsers();

  res.status(200).json(users);
}