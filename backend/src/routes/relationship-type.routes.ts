import { Router } from "express";
import {
  createRelationshipTypeController,
  deleteRelationshipTypeController,
  getRelationshipTypesController,
} from "../controllers/relationship-type.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";
import { requireOrganizationMember } from "../middleware/organization-auth.js";
import { requireRelationshipTypeManager, requireRelationshipTypeOrganizationMember } from "../middleware/relationship-type-organization-auth.js";
import { validate } from "../middleware/validate.js";
import { createRelationshipTypeSchema } from "./relationship-type.schema.js";

const router = Router();
router.get("/organization/:organizationId", authenticate, requireOrganizationMember, asyncHandler(getRelationshipTypesController));
router.post("/", authenticate, validate(createRelationshipTypeSchema), requireOrganizationMember, requireRelationshipTypeManager, asyncHandler(createRelationshipTypeController));
router.delete("/:relationshipTypeId", authenticate, requireRelationshipTypeOrganizationMember, requireRelationshipTypeManager, asyncHandler(deleteRelationshipTypeController));
export default router;
