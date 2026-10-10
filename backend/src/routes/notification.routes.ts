import { Router } from "express";
import {
  getNotificationsController,
  markAllNotificationsReadController,
  markNotificationReadController,
} from "../controllers/notification.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";
import { requireOrganizationMember } from "../middleware/organization-auth.js";

const router = Router();
router.get("/organization/:organizationId", authenticate, requireOrganizationMember, asyncHandler(getNotificationsController));
router.patch("/organization/:organizationId/read-all", authenticate, requireOrganizationMember, asyncHandler(markAllNotificationsReadController));
router.patch("/organization/:organizationId/:notificationId/read", authenticate, requireOrganizationMember, asyncHandler(markNotificationReadController));

export default router;
