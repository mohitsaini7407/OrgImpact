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
 * Only OWNER and ADMIN can update incidents.
 */
router.patch(
  "/:incidentId",
  authenticate,
  requireIncidentOrganizationMember,
  requireRole(
    "OWNER",
    "ADMIN",
  ),
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