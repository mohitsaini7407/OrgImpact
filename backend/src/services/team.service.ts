import { prisma } from "../lib/prisma.js";

export async function createTeam(
  organizationId: string,
  name: string,
  slug: string,
) {
  return prisma.team.create({
    data: {
      organizationId,
      name,
      slug,
    },
  });
}

export async function getOrganizationTeams(
  organizationId: string,
) {
  return prisma.team.findMany({
    where: {
      organizationId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function getTeamById(
  teamId: string,
  organizationId: string,
) {
  return prisma.team.findFirst({
    where: {
      id: teamId,
      organizationId,
    },
  });
}