import { prisma } from "../lib/prisma.js";

const messagePageSize = 50;

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  clientMessageId: string | null;
  createdAt: Date;
  editedAt: Date | null;
  sender: { id: string; name: string };
};

export async function listConversations(organizationId: string, userId: string) {
  const rows = await prisma.conversationMember.findMany({
    where: { userId, conversation: { organizationId } },
    include: {
      conversation: {
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true } } } },
          messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { id: true, name: true } } } },
          team: { select: { id: true, name: true, slug: true } },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
  });

  const activeTeamIds = new Set((await prisma.teamMember.findMany({
    where: { userId, team: { organizationId } },
    select: { teamId: true },
  })).map((membership) => membership.teamId));
  const unreadRows = await prisma.$queryRaw<Array<{ conversationId: string; count: bigint }>>`
    SELECT m."conversationId", COUNT(*)::bigint AS "count"
    FROM "Message" m
    INNER JOIN "ConversationMember" cm ON cm."conversationId" = m."conversationId"
    WHERE cm."userId" = ${userId}
      AND m."senderId" <> ${userId}
      AND m."createdAt" > cm."lastReadAt"
      AND m."conversationId" IN (
        SELECT c."id" FROM "Conversation" c WHERE c."organizationId" = ${organizationId}
      )
    GROUP BY m."conversationId"
  `;
  const unreadByConversation = new Map(unreadRows.map((row) => [row.conversationId, Number(row.count)]));

  return rows
    .filter(({ conversation }) => conversation.type !== "TEAM" || (conversation.teamId && activeTeamIds.has(conversation.teamId)))
    .map(({ conversation }) => ({
      id: conversation.id,
      type: conversation.type,
      title: conversation.title,
      organizationId: conversation.organizationId,
      teamId: conversation.teamId,
      team: conversation.team,
      updatedAt: conversation.updatedAt,
      members: conversation.members.map(({ user }) => user),
      lastMessage: conversation.messages[0] ?? null,
      unreadCount: unreadByConversation.get(conversation.id) ?? 0,
    }));
}

export async function createDirectConversation(organizationId: string, userId: string, otherUserId: string) {
  if (userId === otherUserId) throw new Error("You cannot start a direct conversation with yourself");
  const users = await prisma.membership.findMany({
    where: { organizationId, userId: { in: [userId, otherUserId] } },
    select: { userId: true },
  });
  if (new Set(users.map(({ userId: memberId }) => memberId)).size !== 2) {
    throw new Error("Both people must belong to this organization");
  }

  const directKey = [userId, otherUserId].sort().join(":");
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.conversation.findUnique({
        where: { organizationId_directKey: { organizationId, directKey } },
      });
      if (existing) return existing;

      const conversation = await tx.conversation.create({
        data: {
          organizationId,
          type: "DIRECT",
          directKey,
          members: {
            create: [{ userId }, { userId: otherUserId }],
          },
        },
      });
      return conversation;
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      const existing = await prisma.conversation.findUnique({
        where: { organizationId_directKey: { organizationId, directKey } },
      });
      if (existing) return existing;
    }
    throw error;
  }
}

export async function openTeamConversation(organizationId: string, userId: string, teamId: string) {
  const teamMembership = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId, teamId } },
    include: { team: { select: { id: true, organizationId: true, name: true } } },
  });
  if (!teamMembership || teamMembership.team.organizationId !== organizationId) return null;

  let conversation = await prisma.conversation.findUnique({ where: { teamId } });
  if (!conversation) {
    try {
      conversation = await prisma.conversation.create({
        data: {
          organizationId,
          type: "TEAM",
          teamId,
          title: teamMembership.team.name,
          members: { create: [{ userId, lastReadAt: new Date() }] },
        },
      });
    } catch (error) {
      if (!(typeof error === "object" && error !== null && "code" in error && error.code === "P2002")) throw error;
      conversation = await prisma.conversation.findUnique({ where: { teamId } });
    }
  }
  if (!conversation || conversation.organizationId !== organizationId) return null;

  const currentMembers = await prisma.teamMember.findMany({ where: { teamId }, select: { userId: true } });
  await prisma.conversationMember.createMany({
    data: currentMembers.map(({ userId: memberId }) => ({ conversationId: conversation!.id, userId: memberId })),
    skipDuplicates: true,
  });
  return conversation;
}

export async function getAuthorizedConversation(conversationId: string, userId: string) {
  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    include: { conversation: { select: { id: true, organizationId: true, type: true, teamId: true } } },
  });
  if (!membership) return null;

  const organizationMembership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: membership.conversation.organizationId } },
    select: { id: true },
  });
  if (!organizationMembership) return null;

  if (membership.conversation.type === "TEAM") {
    if (!membership.conversation.teamId) return null;
    const activeTeamMembership = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId: membership.conversation.teamId } },
      select: { id: true },
    });
    if (!activeTeamMembership) return null;
  }
  return membership.conversation;
}

export async function listMessages(conversationId: string, userId: string, before?: string) {
  const conversation = await getAuthorizedConversation(conversationId, userId);
  if (!conversation) return null;

  let cursorId: string | undefined;
  if (before) {
    const cursor = await prisma.message.findFirst({ where: { id: before, conversationId }, select: { id: true } });
    if (!cursor) return [];
    cursorId = cursor.id;
  }
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    take: messagePageSize,
    include: { sender: { select: { id: true, name: true } } },
  });
  return messages.reverse();
}

export async function markConversationRead(conversationId: string, userId: string) {
  const conversation = await getAuthorizedConversation(conversationId, userId);
  if (!conversation) return null;
  const lastReadAt = new Date();
  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt },
  });
  return { conversationId, lastReadAt };
}

export async function persistMessage(input: {
  conversationId: string;
  senderId: string;
  content: string;
  clientMessageId: string;
}) {
  const conversation = await getAuthorizedConversation(input.conversationId, input.senderId);
  if (!conversation) return null;

  const existing = await prisma.message.findUnique({
    where: { senderId_clientMessageId: { senderId: input.senderId, clientMessageId: input.clientMessageId } },
    include: { sender: { select: { id: true, name: true } } },
  });
  if (existing) {
    if (existing.conversationId !== input.conversationId) throw new Error("Message identifier was already used");
    return { message: existing, conversation };
  }

  try {
    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId: input.conversationId,
          senderId: input.senderId,
          content: input.content,
          clientMessageId: input.clientMessageId,
        },
        include: { sender: { select: { id: true, name: true } } },
      });
      await tx.conversation.update({ where: { id: input.conversationId }, data: { updatedAt: created.createdAt } });
      return created;
    });
    return { message, conversation };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      const duplicate = await prisma.message.findUnique({
        where: { senderId_clientMessageId: { senderId: input.senderId, clientMessageId: input.clientMessageId } },
        include: { sender: { select: { id: true, name: true } } },
      });
      if (duplicate?.conversationId === input.conversationId) return { message: duplicate, conversation };
    }
    throw error;
  }
}

export async function getMessageRecipients(conversationId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { type: true, teamId: true, organizationId: true, members: { select: { userId: true } } },
  });
  if (!conversation) return [];
  const memberIds = conversation.members.map(({ userId }) => userId);
  const activeOrganizationMembers = await prisma.membership.findMany({
    where: { organizationId: conversation.organizationId, userId: { in: memberIds } },
    select: { userId: true },
  });
  const organizationMemberIds = activeOrganizationMembers.map(({ userId }) => userId);
  if (conversation.type !== "TEAM" || !conversation.teamId) return organizationMemberIds;
  const activeTeamMembers = await prisma.teamMember.findMany({
    where: { teamId: conversation.teamId, userId: { in: organizationMemberIds } },
    select: { userId: true },
  });
  return activeTeamMembers.map(({ userId }) => userId);
}

export async function conversationLabelForUser(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      team: { select: { name: true } },
      members: { where: { userId: { not: userId } }, include: { user: { select: { name: true } } } },
    },
  });
  if (!conversation) return "Conversation";
  return conversation.type === "TEAM" ? conversation.team?.name ?? "Team channel" : conversation.title ?? conversation.members[0]?.user.name ?? "Direct message";
}
