import { prisma } from "../lib/prisma.js";
export async function requireOrganizationMember(req, res, next) {
    const userId = req.userId;
    const organizationId = req.params.organizationId ||
        req.body.organizationId;
    if (!userId) {
        res.status(401).json({
            error: "Authentication required",
        });
        return;
    }
    if (!organizationId) {
        res.status(400).json({
            error: "Organization ID is required",
        });
        return;
    }
    const membership = await prisma.membership.findUnique({
        where: {
            userId_organizationId: {
                userId,
                organizationId,
            },
        },
    });
    if (!membership) {
        res.status(403).json({
            error: "You are not a member of this organization",
        });
        return;
    }
    req.organizationId = organizationId;
    req.organizationRole = membership.role;
    next();
}
//# sourceMappingURL=organization-auth.js.map