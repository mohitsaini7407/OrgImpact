import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import organizationRoutes from "./routes/organization.routes.js";
import membershipRoutes from "./routes/membership.routes.js";
import userRoutes from "./routes/user.routes.js";
import teamRoutes from "./routes/team.routes.js";
import teamMemberRoutes from "./routes/team-member.routes.js";
import entityTypeRoutes from "./routes/entity-type.routes.js";
import entityRoutes from "./routes/entity.routes.js";
import relationshipRoutes from "./routes/relationship.routes.js";
import impactRoutes from "./routes/impact.routes.js";
import graphRoutes from "./routes/graph.routes.js";

import { errorHandler } from "./middleware/error-handler.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "OrgImpact API",
  });
});

/*
 * Authentication
 */
app.use("/auth", authRoutes);

/*
 * Organizations
 */
app.use("/organizations", organizationRoutes);

/*
 * Memberships
 */
app.use("/memberships", membershipRoutes);

/*
 * Users
 */
app.use("/users", userRoutes);

/*
 * Teams
 */
app.use("/teams", teamRoutes);

/*
 * Team Members
 */
app.use("/team-members", teamMemberRoutes);

/*
 * Entity Types
 */
app.use("/entity-types", entityTypeRoutes);

/*
 * Entities
 */
app.use("/entities", entityRoutes);

/*
 * Relationships
 */
app.use("/relationships", relationshipRoutes);

/*
 * Impact Analysis
 */
app.use("/impact", impactRoutes);

/*
 * Graph
 */
app.use("/graph", graphRoutes);

/*
 * Error Handler
 */
app.use(errorHandler);

export default app;
