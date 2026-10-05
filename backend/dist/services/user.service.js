import { prisma } from "../lib/prisma.js";
export async function createUser(name, email) {
    return prisma.user.create({
        data: {
            name,
            email,
        },
    });
}
export async function getUsers() {
    return prisma.user.findMany({
        orderBy: {
            createdAt: "desc",
        },
    });
}
//# sourceMappingURL=user.service.js.map