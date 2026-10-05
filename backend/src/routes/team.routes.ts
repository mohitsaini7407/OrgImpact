import { Router } from "express";
import {
  createTeamController,
  getOrganizationTeamsController,
  getTeamByIdController,
} from "../controllers/team.controller.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { createTeamSchema } from "./team.schema.js";

const router = Router();

router.post(
  "/",
  validate(createTeamSchema),
  asyncHandler(createTeamController),
);

router.get(
  "/organization/:organizationId",
  asyncHandler(getOrganizationTeamsController),
);

router.get(
  "/:teamId",
  asyncHandler(getTeamByIdController),
);

export default router;