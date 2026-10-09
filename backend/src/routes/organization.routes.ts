import { Router } from "express";

import {
  createOrganizationController,
  getOrganizationsController,
  requestJoinController,
  myJoinRequestsController,
  organizationJoinRequestsController,
  reviewJoinRequestController,
} from "../controllers/organization.controller.js";

import { validate } from "../middleware/validate.js";
import { createOrganizationSchema, joinOrganizationSchema, reviewJoinRequestSchema } from "./organization.schema.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";
import { requireOrganizationMember } from "../middleware/organization-auth.js";
import { requireRole } from "../middleware/require-role.js";

const router = Router();


router.post(
  "/join-requests",
  authenticate,
  validate(joinOrganizationSchema),
  asyncHandler(requestJoinController),
);

router.get(
  "/join-requests/mine",
  authenticate,
  asyncHandler(myJoinRequestsController),
);

router.get(
  "/:organizationId/join-requests",
  authenticate,
  requireOrganizationMember,
  requireRole("OWNER"),
  asyncHandler(organizationJoinRequestsController),
);

router.patch(
  "/:organizationId/join-requests/:requestId",
  authenticate,
  validate(reviewJoinRequestSchema),
  requireOrganizationMember,
  requireRole("OWNER"),
  asyncHandler(reviewJoinRequestController),
);

router.post(
  "/",
  authenticate,
  validate(createOrganizationSchema),
  asyncHandler(createOrganizationController),
);

router.get(
  "/",
  authenticate,
  asyncHandler(getOrganizationsController),
);

export default router;
