import { prisma } from "../lib/prisma.js";
export async function requireRelationshipOrganizationMember(req, res, next) {
    const userId = req.userId;
    const relationshipId = req.params.relationshipId;
    if (!userId) {
        res.status(401).json({
            error: "Authentication required",
        });
        return;
    }
    if (typeof relationshipId !== "string") {
        res.status(400).json({
            error: "Relationship ID is required",
        });
        return;
    }
    const relationship = await prisma.relationship.findUnique({
        where: {
            id: relationshipId,
        },
        select: {
            id: true,
            organizationId: true,
        },
    });
    if (!relationship) {
        res.status(404).json({
            error: "Relationship not found",
        });
        return;
    }
    const membership = await prisma.membership.findUnique({
        where: {
            userId_organizationId: {
                userId,
                organizationId: relationship.organizationId,
            },
        },
    });
    if (!membership) {
        res.status(403).json({
            error: "You are not a member of this organization",
        });
        return;
    }
    req.organizationId = relationship.organizationId;
    req.organizationRole = membership.role;
    next();
}
//# sourceMappingURL=relationship-organization-auth.js.map