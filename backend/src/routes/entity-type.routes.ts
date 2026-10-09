import { Router } from "express";

import {
  createEntityTypeController,
  deleteEntityTypeController,
  getEntityTypesController,
  updateEntityTypeController,
} from "../controllers/entity-type.controller.js";

import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";
import { requireOrganizationMember } from "../middleware/organization-auth.js";
import {
  requireEntityTypeManager,
  requireEntityTypeOrganizationMember,
} from "../middleware/entity-type-organization-auth.js";
import { validate } from "../middleware/validate.js";
import { createEntityTypeSchema, updateEntityTypeSchema } from "./entity-type.schema.js";

const router = Router();

router.get(
  "/organization/:organizationId",
  authenticate,
  requireOrganizationMember,
  asyncHandler(getEntityTypesController),
);

router.post(
  "/",
  authenticate,
  validate(createEntityTypeSchema),
  requireOrganizationMember,
  requireEntityTypeManager,
  asyncHandler(createEntityTypeController),
);

router.patch(
  "/:entityTypeId",
  authenticate,
  requireEntityTypeOrganizationMember,
  requireEntityTypeManager,
  validate(updateEntityTypeSchema),
  asyncHandler(updateEntityTypeController),
);

router.delete(
  "/:entityTypeId",
  authenticate,
  requireEntityTypeOrganizationMember,
  requireEntityTypeManager,
  asyncHandler(deleteEntityTypeController),
);

export default router;