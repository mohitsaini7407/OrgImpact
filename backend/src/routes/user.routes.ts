import { Router } from "express";
import { getUsersController } from "../controllers/user.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(getUsersController),
);

export default router;