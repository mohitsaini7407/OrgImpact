import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";
import { requireEntityOrganizationMember } from "../middleware/entity-organization-auth.js";
import { analyzeImpactController } from "../controllers/impact.controller.js";
const router = Router();
router.get("/:entityId", authenticate, requireEntityOrganizationMember, asyncHandler(analyzeImpactController));
export default router;
//# sourceMappingURL=impact.routes.js.map