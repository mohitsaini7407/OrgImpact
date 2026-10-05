import { prisma } from "../lib/prisma.js";

export async function createUser(
  name: string,
  email: string,
) {
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