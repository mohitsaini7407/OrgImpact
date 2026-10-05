import { Router } from "express";
import {
  createMembershipController,
  getOrganizationMembersController,
} from "../controllers/membership.controller.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { createMembershipSchema } from "./membership.schema.js";

const router = Router();

router.post(
  "/",
  validate(createMembershipSchema),
  asyncHandler(createMembershipController),
);

router.get(
  "/organization/:organizationId",
  asyncHandler(getOrganizationMembersController),
);

export default router;