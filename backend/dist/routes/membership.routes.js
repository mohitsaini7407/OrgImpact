import { Router } from "express";
import { createMembershipController, getOrganizationMembersController, } from "../controllers/membership.controller.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";
import { requireOrganizationMember } from "../middleware/organization-auth.js";
import { requireRole } from "../middleware/require-role.js";
import { createMembershipSchema } from "./membership.schema.js";
const router = Router();
router.post("/", authenticate, validate(createMembershipSchema), requireOrganizationMember, requireRole("OWNER", "ADMIN"), asyncHandler(createMembershipController));
router.get("/organization/:organizationId", authenticate, requireOrganizationMember, asyncHandler(getOrganizationMembersController));
export default router;
//# sourceMappingURL=membership.routes.js.map