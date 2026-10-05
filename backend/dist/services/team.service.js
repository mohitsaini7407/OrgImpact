import { prisma } from "../lib/prisma.js";
export async function createTeam(organizationId, name, slug) {
    return prisma.team.create({
        data: {
            organizationId,
            name,
            slug,
        },
    });
}
export async function getOrganizationTeams(organizationId) {
    return prisma.team.findMany({
        where: {
            organizationId,
        },
        orderBy: {
            createdAt: "asc",
        },
    });
}
export async function getTeamById(teamId) {
    return prisma.team.findUnique({
        where: {
            id: teamId,
        },
    });
}
//# sourceMappingURL=team.service.js.map