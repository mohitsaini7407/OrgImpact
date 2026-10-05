import { prisma } from "../lib/prisma.js";
export async function createOrganization(name, slug, ownerId) {
    return prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
            data: {
                name,
                slug,
            },
        });
        await tx.membership.create({
            data: {
                userId: ownerId,
                organizationId: organization.id,
                role: "OWNER",
            },
        });
        return organization;
    });
}
export async function getOrganizations(userId) {
    return prisma.organization.findMany({
        where: {
            memberships: {
                some: {
                    userId,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}
//# sourceMappingURL=organization.service.js.map