import { prisma } from "../lib/prisma.js";
import crypto from "node:crypto";

const defaultEntityTypes = [
  { name: "Service", color: "#2563EB" },
  { name: "Database", color: "#16A34A" },
  { name: "Application", color: "#9333EA" },
  { name: "Infrastructure", color: "#EA580C" },
  { name: "Network", color: "#0891B2" },
  { name: "Security", color: "#DC2626" },
];

export async function createOrganization(
  name: string,
  slug: string,
  ownerId: string,
) {
  const joinCode = await generateUniqueJoinCode();
  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name,
        slug,
        joinCode,
        createdById: ownerId,
      },
    });

    await tx.membership.create({
      data: {
        userId: ownerId,
        organizationId: organization.id,
        role: "OWNER",
      },
    });

    await tx.entityType.createMany({
      data: defaultEntityTypes.map((entityType) => ({
        ...entityType,
        organizationId: organization.id,
      })),
    });

    return organization;
  });
}

export async function getOrganizations(userId: string) {
  return prisma.organization.findMany({
    where: {
      memberships: {
        some: {
          userId,
        },
      },
    },
    select: { id: true, name: true, slug: true, joinCode: true, createdById: true, createdAt: true, updatedAt: true },
    orderBy: {
      createdAt: "desc",
    },
  });
}


function makeJoinCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const chars = Array.from({ length: 12 }, () => alphabet[crypto.randomInt(0, alphabet.length)]);
  return `${chars.slice(0, 3).join("")}-${chars.slice(3, 6).join("")}-${chars.slice(6, 9).join("")}-${chars.slice(9).join("")}`;
}

async function generateUniqueJoinCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = makeJoinCode();
    const exists = await prisma.organization.findUnique({ where: { joinCode: code }, select: { id: true } });
    if (!exists) return code;
  }
  throw new Error("Unable to generate an organization join code. Please try again.");
}

export async function requestOrganizationMembership(userId: string, rawCode: string) {
  const joinCode = rawCode.trim().toUpperCase();
  const organization = await prisma.organization.findUnique({ where: { joinCode } });
  if (!organization) throw new Error("Invalid organization join code");

  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: organization.id } },
  });
  if (membership) throw new Error("You are already a member of this organization");

  const existing = await prisma.organizationJoinRequest.findUnique({
    where: { organizationId_userId: { organizationId: organization.id, userId } },
  });
  if (existing?.status === "PENDING") throw new Error("Your join request is already pending");
  if (existing?.status === "APPROVED") throw new Error("You are already a member of this organization");

  const request = existing
    ? await prisma.organizationJoinRequest.update({
        where: { id: existing.id },
        data: { status: "PENDING", reviewedById: null, reviewedAt: null },
      })
    : await prisma.organizationJoinRequest.create({
        data: { organizationId: organization.id, userId, status: "PENDING" },
      });

  return { id: request.id, status: request.status, organization: { id: organization.id, name: organization.name, slug: organization.slug } };
}

export async function getMyJoinRequests(userId: string) {
  return prisma.organizationJoinRequest.findMany({
    where: { userId },
    include: { organization: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrganizationJoinRequests(organizationId: string) {
  return prisma.organizationJoinRequest.findMany({
    where: { organizationId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function reviewOrganizationJoinRequest(
  organizationId: string,
  requestId: string,
  reviewerId: string,
  decision: "APPROVED" | "REJECTED",
) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.organizationJoinRequest.findFirst({
      where: { id: requestId, organizationId },
    });
    if (!request) throw new Error("Join request not found");
    if (request.status !== "PENDING") throw new Error("Join request has already been reviewed");

    if (decision === "APPROVED") {
      await tx.membership.upsert({
        where: { userId_organizationId: { userId: request.userId, organizationId } },
        create: { userId: request.userId, organizationId, role: "MEMBER" },
        update: {},
      });
    }

    return tx.organizationJoinRequest.update({
      where: { id: requestId },
      data: { status: decision, reviewedById: reviewerId, reviewedAt: new Date() },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  });
}
