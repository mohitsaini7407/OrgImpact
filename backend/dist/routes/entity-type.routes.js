import { Router } from "express";
import { createEntityTypeController, getEntityTypesController, } from "../controllers/entity-type.controller.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";
import { createEntityTypeSchema } from "./entity-type.schema.js";
const router = Router();
router.post("/", authenticate, validate(createEntityTypeSchema), asyncHandler(createEntityTypeController));
router.get("/", authenticate, asyncHandler(getEntityTypesController));
export default router;
//# sourceMappingURL=entity-type.routes.js.map