import { Router } from "express";

import {
  createEntityController,
  getOrganizationEntitiesController,
  getEntityByIdController,
  updateEntityController,
  deleteEntityController,
} from "../controllers/entity.controller.js";

import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";
import { requireOrganizationMember } from "../middleware/organization-auth.js";
import { requireEntityOrganizationMember } from "../middleware/entity-organization-auth.js";

import {
  createEntitySchema,
  updateEntitySchema,
} from "./entity.schema.js";

const router = Router();

router.post(
  "/",
  authenticate,
  validate(createEntitySchema),
  requireOrganizationMember,
  asyncHandler(createEntityController),
);

router.get(
  "/organization/:organizationId",
  authenticate,
  requireOrganizationMember,
  asyncHandler(getOrganizationEntitiesController),
);

router.get(
  "/:entityId",
  authenticate,
  requireEntityOrganizationMember,
  asyncHandler(getEntityByIdController),
);

router.patch(
  "/:entityId",
  authenticate,
  requireEntityOrganizationMember,
  validate(updateEntitySchema),
  asyncHandler(updateEntityController),
);

router.delete(
  "/:entityId",
  authenticate,
  requireEntityOrganizationMember,
  asyncHandler(deleteEntityController),
);

export default router;
