import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";
import { requireOrganizationMember } from "../middleware/organization-auth.js";
import { getOrganizationGraphController } from "../controllers/graph.controller.js";

const router = Router();

router.get(
  "/organization/:organizationId",
  authenticate,
  requireOrganizationMember,
  asyncHandler(getOrganizationGraphController),
);

export default router;
