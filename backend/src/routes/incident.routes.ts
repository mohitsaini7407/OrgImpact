import { Router } from "express";

import {
  createIncidentController,
  deleteIncidentController,
  getIncidentController,
  getIncidentImpactController,
  getOrganizationIncidentsController,
  updateIncidentController,
} from "../controllers/incident.controller.js";

import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";
import {
  requireIncidentOrganizationMember,
} from "../middleware/incident-organization-auth.js";
import {
  requireOrganizationMember,
} from "../middleware/organization-auth.js";
import { requireRole } from "../middleware/require-role.js";
import { validate } from "../middleware/validate.js";

import {
  createIncidentSchema,
  updateIncidentSchema,
} from "./incident.schema.js";

const router = Router();

/*
 * Create incident
 */
router.post(
  "/",
  authenticate,
  validate(createIncidentSchema),
  requireOrganizationMember,
  requireRole(
    "OWNER",
    "ADMIN",
    "MEMBER",
  ),
  asyncHandler(createIncidentController),
);

/*
 * Get all incidents for an organization
 */
router.get(
  "/organization/:organizationId",
  authenticate,
  requireOrganizationMember,
  asyncHandler(
    getOrganizationIncidentsController,
  ),
);

/*
 * Get incident impact
 */
router.get(
  "/:incidentId/impact",
  authenticate,
  requireIncidentOrganizationMember,
  asyncHandler(
    getIncidentImpactController,
  ),
);

/*
 * Get single incident
 */
router.get(
  "/:incidentId",
  authenticate,
  requireIncidentOrganizationMember,
  asyncHandler(
    getIncidentController,
  ),
);

/*
 * Update incident
 *
 * Incident status changes follow the status owner rule in the service.
 * Other incident edits remain limited to OWNER and ADMIN there.
 */
router.patch(
  "/:incidentId",
  authenticate,
  requireIncidentOrganizationMember,
  validate(updateIncidentSchema),
  asyncHandler(
    updateIncidentController,
  ),
);

/*
 * Delete incident
 *
 * Only OWNER and ADMIN can delete incidents.
 */
router.delete(
  "/:incidentId",
  authenticate,
  requireIncidentOrganizationMember,
  requireRole(
    "OWNER",
    "ADMIN",
  ),
  asyncHandler(
    deleteIncidentController,
  ),
);

export default router;
