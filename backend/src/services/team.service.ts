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
    include: {
      members: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          userId: true,
          teamId: true,
          role: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
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

export async function updateTeam(
  teamId: string,
  organizationId: string,
  name: string,
  slug: string,
) {
  const team = await prisma.team.findFirst({
    where: { id: teamId, organizationId },
    select: { id: true },
  });
  if (!team) return null;

  return prisma.team.update({
    where: { id: team.id },
    data: { name, slug },
  });
}

export async function deleteTeam(teamId: string, organizationId: string) {
  const result = await prisma.team.deleteMany({
    where: { id: teamId, organizationId },
  });
  return result.count > 0;
}
