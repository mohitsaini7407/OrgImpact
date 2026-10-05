import { Router } from "express";
import { loginController, meController, registerController, } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { loginSchema, registerSchema, } from "./auth.schema.js";
import { validate } from "../middleware/validate.js";
const router = Router();
router.post("/register", validate(registerSchema), asyncHandler(registerController));
router.post("/login", validate(loginSchema), asyncHandler(loginController));
router.get("/me", authenticate, asyncHandler(meController));
export default router;
//# sourceMappingURL=auth.routes.js.map