import { Router } from "express";
import {
  createUserController,
  getUsersController,
} from "../controllers/user.controller.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";
import { createUserSchema } from "./user.schema.js";

const router = Router();

router.post(
  "/",
  authenticate,
  validate(createUserSchema),
  asyncHandler(createUserController),
);

router.get(
  "/",
  authenticate,
  asyncHandler(getUsersController),
);

export default router;