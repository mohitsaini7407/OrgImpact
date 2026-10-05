import { prisma } from "../lib/prisma.js";
export async function createTeamMember(userId, teamId, role) {
    return prisma.teamMember.create({
        data: {
            userId,
            teamId,
            role,
        },
    });
}
export async function getTeamMembers(teamId) {
    return prisma.teamMember.findMany({
        where: {
            teamId,
        },
        include: {
            user: true,
        },
        orderBy: {
            createdAt: "asc",
        },
    });
}
//# sourceMappingURL=team-member.service.js.map