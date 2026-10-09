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
import chatRoutes from "./routes/chat.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import { getAllowedFrontendOrigins } from "./config/security.js";

const app = express();
const allowedOrigins = getAllowedFrontendOrigins();
const proxyHops = Number(process.env.TRUST_PROXY_HOPS ?? "0");
if (Number.isInteger(proxyHops) && proxyHops > 0 && proxyHops <= 5) {
  app.set("trust proxy", proxyHops);
}

app.disable("x-powered-by");
app.use((_, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS"));
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "1mb" }));

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
app.use("/chat", chatRoutes);

app.use(errorHandler);

export default app;
