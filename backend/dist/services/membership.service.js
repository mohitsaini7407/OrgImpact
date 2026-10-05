import { prisma } from "../lib/prisma.js";
const VALID_ROLES = ["OWNER", "ADMIN", "MEMBER"];
export async function createMembership(userId, organizationId, role) {
    if (!VALID_ROLES.includes(role)) {
        throw new Error("Invalid membership role. Allowed roles: OWNER, ADMIN, MEMBER");
    }
    return prisma.membership.create({
        data: {
            userId,
            organizationId,
            role,
        },
    });
}
export async function getOrganizationMembers(organizationId) {
    return prisma.membership.findMany({
        where: {
            organizationId,
        },
        include: {
            user: true,
        },
        orderBy: {
            createdAt: "asc",
        },
    });
}
//# sourceMappingURL=membership.service.js.map