import { Router } from "express";
import {
  createDirectConversationController,
  listConversationsController,
  listMessagesController,
  markConversationReadController,
  openTeamConversationController,
} from "../controllers/chat.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";
import { requireOrganizationMember } from "../middleware/organization-auth.js";
import { requireTeamOrganizationMember } from "../middleware/team-organization-auth.js";
import { validate } from "../middleware/validate.js";
import { createDirectConversationSchema } from "./chat.schema.js";

const router = Router();

router.get(
  "/organizations/:organizationId/conversations",
  authenticate,
  requireOrganizationMember,
  asyncHandler(listConversationsController),
);

router.post(
  "/organizations/:organizationId/conversations/direct",
  authenticate,
  validate(createDirectConversationSchema),
  requireOrganizationMember,
  asyncHandler(createDirectConversationController),
);

router.post(
  "/organizations/:organizationId/conversations/teams/:teamId",
  authenticate,
  requireOrganizationMember,
  requireTeamOrganizationMember,
  asyncHandler(openTeamConversationController),
);

router.get(
  "/conversations/:conversationId/messages",
  authenticate,
  asyncHandler(listMessagesController),
);

router.patch(
  "/conversations/:conversationId/read",
  authenticate,
  asyncHandler(markConversationReadController),
);

export default router;
