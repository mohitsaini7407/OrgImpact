import { URL } from "node:url";

export function getAllowedFrontendOrigins(): string[] {
  return (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

export function validateProductionConfig() {
  if (process.env.NODE_ENV !== "production") return;
  const required = ["DATABASE_URL", "REDIS_URL", "JWT_SECRET", "JWT_EXPIRES_IN", "FRONTEND_URL"];
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length) throw new Error(`Missing required production configuration: ${missing.join(", ")}`);
  if (!getAllowedFrontendOrigins().length) throw new Error("FRONTEND_URL must include at least one frontend origin");
  if ((process.env.JWT_SECRET ?? "").trim().length < 32) throw new Error("JWT_SECRET must contain at least 32 characters in production");
  for (const origin of getAllowedFrontendOrigins()) {
    let parsed: URL;
    try { parsed = new URL(origin); } catch { throw new Error("FRONTEND_URL must contain valid frontend origins"); }
    if (parsed.protocol !== "https:" || parsed.origin !== origin) throw new Error("FRONTEND_URL must contain HTTPS origins without paths");
  }
  const proxyHops = Number(process.env.TRUST_PROXY_HOPS ?? "0");
  if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 5) {
    throw new Error("TRUST_PROXY_HOPS must be an integer from 0 to 5");
  }
}
