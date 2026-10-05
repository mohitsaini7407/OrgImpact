import { Router } from "express";
import {
  createTeamMemberController,
  getTeamMembersController,
} from "../controllers/team-member.controller.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { createTeamMemberSchema } from "./team-member.schema.js";

const router = Router();

router.post(
  "/",
  validate(createTeamMemberSchema),
  asyncHandler(createTeamMemberController),
);

router.get(
  "/team/:teamId",
  asyncHandler(getTeamMembersController),
);

export default router;