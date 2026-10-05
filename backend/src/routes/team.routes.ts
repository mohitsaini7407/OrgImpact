import { Router } from "express";

import {
  createTeamController,
  getOrganizationTeamsController,
  getTeamByIdController,
} from "../controllers/team.controller.js";

import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";
import { requireOrganizationMember } from "../middleware/organization-auth.js";
import { requireTeamOrganizationMember } from "../middleware/team-organization-auth.js";
import { requireRole } from "../middleware/require-role.js";

import { createTeamSchema } from "./team.schema.js";

const router = Router();

router.post(
  "/",
  authenticate,
  validate(createTeamSchema),
  requireOrganizationMember,
  requireRole("OWNER", "ADMIN"),
  asyncHandler(createTeamController),
);

router.get(
  "/organization/:organizationId",
  authenticate,
  requireOrganizationMember,
  asyncHandler(getOrganizationTeamsController),
);

router.get(
  "/:teamId",
  authenticate,
  requireTeamOrganizationMember,
  asyncHandler(getTeamByIdController),
);

export default router;
