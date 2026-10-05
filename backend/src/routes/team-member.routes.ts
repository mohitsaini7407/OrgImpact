import { Router } from "express";

import {
  createTeamMemberController,
  getTeamMembersController,
} from "../controllers/team-member.controller.js";

import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";
import { requireTeamOrganizationMember } from "../middleware/team-organization-auth.js";
import { requireRole } from "../middleware/require-role.js";

import { createTeamMemberSchema } from "./team-member.schema.js";

const router = Router();

router.post(
  "/",
  authenticate,
  validate(createTeamMemberSchema),
  requireTeamOrganizationMember,
  requireRole("OWNER", "ADMIN"),
  asyncHandler(createTeamMemberController),
);

router.get(
  "/team/:teamId",
  authenticate,
  requireTeamOrganizationMember,
  asyncHandler(getTeamMembersController),
);

export default router;
