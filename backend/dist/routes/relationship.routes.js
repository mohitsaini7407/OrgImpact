import { Router } from "express";
import { createRelationshipController, getOrganizationRelationshipsController, deleteRelationshipController, } from "../controllers/relationship.controller.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";
import { requireOrganizationMember } from "../middleware/organization-auth.js";
import { requireRelationshipOrganizationMember } from "../middleware/relationship-organization-auth.js";
import { createRelationshipSchema } from "./relationship.schema.js";
const router = Router();
router.post("/", authenticate, validate(createRelationshipSchema), requireOrganizationMember, asyncHandler(createRelationshipController));
router.get("/organization/:organizationId", authenticate, requireOrganizationMember, asyncHandler(getOrganizationRelationshipsController));
router.delete("/:relationshipId", authenticate, requireRelationshipOrganizationMember, asyncHandler(deleteRelationshipController));
export default router;
//# sourceMappingURL=relationship.routes.js.map