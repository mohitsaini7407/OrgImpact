import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { getAllowedFrontendOrigins } from "../config/security.js";

const INVITATION_TTL_HOURS = 72;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function getFrontendUrl(): string {
  return getAllowedFrontendOrigins()[0] || "http://localhost:5173";
}

export async function createOrganizationInvitation(
  email: string,
  organizationId: string,
  role: string,
  invitedById: string,
) {
  const normalizedEmail = email.trim().toLowerCase();

  const [organization, existingUser] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    prisma.user.findUnique({ where: { email: normalizedEmail } }),
  ]);

  if (!organization) throw new Error("Organization not found");

  const [inviterMembership, organizationOwner] = await Promise.all([
    prisma.membership.findUnique({
      where: { userId_organizationId: { userId: invitedById, organizationId } },
      select: { role: true },
    }),
    prisma.organization.findUnique({ where: { id: organizationId }, select: { createdById: true } }),
  ]);
  const inviterIsCreator = organizationOwner?.createdById === invitedById;
  const allowedRoles = inviterIsCreator ? ["OWNER", "ADMIN", "MEMBER"] : inviterMembership?.role === "OWNER" ? ["ADMIN", "MEMBER"] : inviterMembership?.role === "ADMIN" ? ["MEMBER"] : [];
  if (!allowedRoles.includes(role)) throw new Error("You do not have permission to invite a user with this role");

  if (existingUser) {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: existingUser.id,
          organizationId,
        },
      },
    });

    if (membership) {
      throw new Error("User is already a member of this organization");
    }
  }

  await prisma.organizationInvitation.updateMany({
    where: {
      organizationId,
      email: normalizedEmail,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { expiresAt: new Date() },
  });

  const rawToken = createRawToken();
  const expiresAt = new Date(Date.now() + INVITATION_TTL_HOURS * 60 * 60 * 1000);

  await prisma.organizationInvitation.create({
    data: {
      organizationId,
      email: normalizedEmail,
      role,
      tokenHash: hashToken(rawToken),
      expiresAt,
      invitedById,
    },
  });

  return {
    email: normalizedEmail,
    role,
    organizationName: organization.name,
    expiresAt,
    invitationUrl: `${getFrontendUrl()}/?invite=${rawToken}`,
  };
}

export async function getInvitationByToken(rawToken: string) {
  const invitation = await prisma.organizationInvitation.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { organization: true },
  });

  if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) {
    throw new Error("Invitation is invalid or has expired");
  }

  const existingUser = await prisma.user.findUnique({ where: { email: invitation.email } });

  return {
    email: invitation.email,
    role: invitation.role,
    organizationName: invitation.organization.name,
    expiresAt: invitation.expiresAt,
    accountExists: Boolean(existingUser),
  };
}

export async function acceptOrganizationInvitation(
  rawToken: string,
  name: string | undefined,
  password: string | undefined,
  authenticatedUserId?: string,
) {
  const tokenHash = hashToken(rawToken);

  return prisma.$transaction(async (tx) => {
    const invitation = await tx.organizationInvitation.findUnique({
      where: { tokenHash },
      include: { organization: true },
    });

    if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) {
      throw new Error("Invitation is invalid or has expired");
    }

    const existingUser = await tx.user.findUnique({
      where: { email: invitation.email },
    });

    let userId: string;

    if (existingUser) {
      if (!authenticatedUserId || authenticatedUserId !== existingUser.id) {
        throw new Error("Sign in to the invited account to accept this invitation");
      }

      const existingMembership = await tx.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: existingUser.id,
            organizationId: invitation.organizationId,
          },
        },
      });

      if (existingMembership) {
        throw new Error("User is already a member of this organization");
      }

      userId = existingUser.id;
    } else {
      if (!name || !password) {
        throw new Error("Name and password are required to create your account");
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const createdUser = await tx.user.create({
        data: {
          name: name.trim(),
          email: invitation.email,
          passwordHash,
        },
      });
      userId = createdUser.id;
    }

    await tx.membership.create({
      data: {
        userId,
        organizationId: invitation.organizationId,
        role: invitation.role,
      },
    });

    await tx.organizationInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    return {
      email: invitation.email,
      organizationName: invitation.organization.name,
      role: invitation.role,
    };
  });
}
