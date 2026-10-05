import { Router } from "express";
import {
  createUserController,
  getUsersController,
} from "../controllers/user.controller.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { createUserSchema } from "./user.schema.js";

const router = Router();

router.post(
  "/",
  validate(createUserSchema),
  asyncHandler(createUserController),
);

router.get(
  "/",
  asyncHandler(getUsersController),
);

export default router;