# Deployment security checklist

## Required production configuration

Set backend secrets in the hosting provider?s secret manager. Do not commit .env files or paste secret values into logs or support requests. The backend validates required settings at startup when NODE_ENV=production.

- DATABASE_URL: PostgreSQL connection string with TLS enabled by the database provider.
- REDIS_URL: private/authenticated Redis connection; use TLS where supported.
- JWT_SECRET: independently generated random secret with at least 32 characters.
- JWT_EXPIRES_IN: short-lived session lifetime appropriate for the product.
- FRONTEND_URL: comma-separated exact HTTPS origin(s), with no path.
- PORT: hosting platform port, if provided.
- TRUST_PROXY_HOPS: number of trusted reverse proxies (default 0; set only to the verified proxy hop count).

Set VITE_API_BASE_URL at frontend build time to the HTTPS backend origin. See frontend/.env.example. Rebuild the frontend after changing it. Email verification is currently disabled; registered email addresses are not proven to belong to the user. Do not use email ownership alone for sensitive account recovery or authorization until a verification flow is re-enabled.

## Before launch

1. Provision managed PostgreSQL and Redis, then configure backups, TLS, access controls, and least-privilege credentials.
2. Apply Prisma migrations with the deployment migration command after reviewing SQL; do not run development database reset commands.
3. Deploy the long-running Socket.IO backend on a host that supports WebSockets and persistent processes. Configure Redis pub/sub across backend instances if scaling horizontally.
4. Restrict CORS to the exact frontend origins and configure the frontend API URL.
5. Rotate any credential ever committed, shared, or exposed; adding it to .gitignore does not revoke it.
6. Configure HTTPS, domain/DNS, provider secret storage, logs/alerts, dependency update monitoring, and database recovery before inviting users.

## Current review notes

- Backend and frontend production builds and Prisma schema validation pass in the reviewed workspace.
- The production frontend dependency audit reports no known vulnerabilities. The backend dependency audit reports four high-severity advisories in the Prisma CLI/tooling dependency tree; npm only offered a breaking Prisma downgrade at review time. Recheck the advisories and Prisma releases before production deployment.
- End-to-end authentication, email delivery, Redis connectivity, WebSocket delivery across separate deployed instances, database migration execution, hosting configuration, and backup restoration require the actual production services and were not verified here.
