import { Router } from "express";

import { getEntityTypesController } from "../controllers/entity-type.controller.js";

import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(getEntityTypesController),
);

export default router;