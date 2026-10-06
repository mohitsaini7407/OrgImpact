import { prisma } from "../lib/prisma.js";

export async function getUsers(userId: string) {
  return prisma.user.findMany({
    where: {
      memberships: {
        some: {
          organization: {
            memberships: {
              some: {
                userId,
              },
            },
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}