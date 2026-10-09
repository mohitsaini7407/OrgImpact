-- Email verification, organization join codes, and join-request workflow.
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

ALTER TABLE "Organization" ADD COLUMN "joinCode" TEXT;
UPDATE "Organization" SET "joinCode" = upper(substr(md5("id"), 1, 12)) WHERE "joinCode" IS NULL;
ALTER TABLE "Organization" ALTER COLUMN "joinCode" SET NOT NULL;
CREATE UNIQUE INDEX "Organization_joinCode_key" ON "Organization"("joinCode");

CREATE TABLE "EmailVerificationOTP" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "resendAvailableAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmailVerificationOTP_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EmailVerificationOTP_email_key" ON "EmailVerificationOTP"("email");
CREATE INDEX "EmailVerificationOTP_expiresAt_idx" ON "EmailVerificationOTP"("expiresAt");

CREATE TABLE "OrganizationJoinRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrganizationJoinRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrganizationJoinRequest_organizationId_userId_key" ON "OrganizationJoinRequest"("organizationId", "userId");
CREATE INDEX "OrganizationJoinRequest_organizationId_status_idx" ON "OrganizationJoinRequest"("organizationId", "status");
CREATE INDEX "OrganizationJoinRequest_userId_status_idx" ON "OrganizationJoinRequest"("userId", "status");
ALTER TABLE "OrganizationJoinRequest" ADD CONSTRAINT "OrganizationJoinRequest_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationJoinRequest" ADD CONSTRAINT "OrganizationJoinRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
