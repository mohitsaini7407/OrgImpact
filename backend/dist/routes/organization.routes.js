import { Router } from "express";
import { createOrganizationController, getOrganizationsController, } from "../controllers/organization.controller.js";
import { validate } from "../middleware/validate.js";
import { createOrganizationSchema } from "./organization.schema.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";
const router = Router();
router.post("/", authenticate, validate(createOrganizationSchema), asyncHandler(createOrganizationController));
router.get("/", authenticate, asyncHandler(getOrganizationsController));
export default router;
//# sourceMappingURL=organization.routes.js.map