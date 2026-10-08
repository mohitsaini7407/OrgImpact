import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }

  return secret;
}

function getJwtExpiresIn(): jwt.SignOptions["expiresIn"] {
  const expiresIn = process.env.JWT_EXPIRES_IN;

  if (!expiresIn) {
    throw new Error("JWT_EXPIRES_IN is not defined");
  }

  return expiresIn as jwt.SignOptions["expiresIn"];
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
) {
  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });
}

export async function loginUser(
  email: string,
  password: string,
) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.passwordHash) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    return null;
  }

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    getJwtSecret(),
    {
      expiresIn: getJwtExpiresIn() as jwt.SignOptions["expiresIn"],
    } as jwt.SignOptions,
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  };
}

export async function getUserById(
  userId: string,
) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      memberships: {
        include: {
          organization: true,
        },
      },
    },
  });
}