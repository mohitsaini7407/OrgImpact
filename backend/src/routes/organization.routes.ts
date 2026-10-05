import { Router } from "express";
import {
  createOrganizationController,
  getOrganizationsController,
} from "../controllers/organization.controller.js";
import { validate } from "../middleware/validate.js";
import { createOrganizationSchema } from "./organization.schema.js";
import { asyncHandler } from "../middleware/async-handler.js";

const router = Router();

router.post(
  "/",
  validate(createOrganizationSchema),
  asyncHandler(createOrganizationController),
);

router.get("/", asyncHandler(getOrganizationsController));

export default router;