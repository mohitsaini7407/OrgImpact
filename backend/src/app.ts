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
import incidentRoutes from "./routes/incident.routes.js";
import graphRoutes from "./routes/graph.routes.js";
import invitationRoutes from "./routes/invitation.routes.js";
import { errorHandler } from "./middleware/error-handler.js";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "OrgImpact API",
  });
});

app.use("/auth", authRoutes);
app.use("/organizations", organizationRoutes);
app.use("/memberships", membershipRoutes);
app.use("/invitations", invitationRoutes);
app.use("/users", userRoutes);
app.use("/teams", teamRoutes);
app.use("/team-members", teamMemberRoutes);
app.use("/entity-types", entityTypeRoutes);
app.use("/entities", entityRoutes);
app.use("/relationships", relationshipRoutes);
app.use("/impact", impactRoutes);
app.use("/incidents", incidentRoutes);
app.use("/graph", graphRoutes);

app.use(errorHandler);

export default app;
