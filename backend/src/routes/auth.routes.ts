import { Router } from "express";

import {
  loginController,
  meController,
  registerController,
  updateProfileController,
} from "../controllers/auth.controller.js";

import { authenticate } from "../middleware/auth.js";
import { authRateLimit } from "../middleware/auth-rate-limit.js";

import { asyncHandler } from "../middleware/async-handler.js";

import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from "./auth.schema.js";

import { validate } from "../middleware/validate.js";

const router = Router();

router.post(
  "/register",
  authRateLimit(5),
  validate(registerSchema),
  asyncHandler(registerController),
);

router.post(
  "/login",
  authRateLimit(10),
  validate(loginSchema),
  asyncHandler(loginController),
);

router.get(
  "/me",
  authenticate,
  asyncHandler(meController),
);

router.patch(
  "/me",
  authenticate,
  validate(updateProfileSchema),
  asyncHandler(updateProfileController),
);

export default router;
