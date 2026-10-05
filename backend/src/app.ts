import express from "express";
import organizationRoutes from "./routes/organization.routes.js";
import membershipRoutes from "./routes/membership.routes.js";
import userRoutes from "./routes/user.routes.js";
import { errorHandler } from "./middleware/error-handler.js";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "OrgImpact API",
  });
});

app.use("/organizations", organizationRoutes);
app.use("/memberships", membershipRoutes);
app.use("/users", userRoutes);

// Error handler must be LAST
app.use(errorHandler);

export default app;