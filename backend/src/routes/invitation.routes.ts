import { Router } from "express";
import { createInvitationController, getInvitationController, acceptInvitationController } from "../controllers/invitation.controller.js";
import { authenticate } from "../middleware/auth.js";
import { requireOrganizationMember } from "../middleware/organization-auth.js";
import { requireRole } from "../middleware/require-role.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { validate } from "../middleware/validate.js";
import { createInvitationSchema, acceptInvitationSchema } from "./invitation.schema.js";

const router = Router();

router.post(
  "/",
  authenticate,
  validate(createInvitationSchema),
  requireOrganizationMember,
  requireRole("OWNER", "ADMIN"),
  asyncHandler(createInvitationController),
);

router.get("/:token", asyncHandler(getInvitationController));

router.post(
  "/:token/accept",
  validate(acceptInvitationSchema),
  asyncHandler(acceptInvitationController),
);

export default router;
