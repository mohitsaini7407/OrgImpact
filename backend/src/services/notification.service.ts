import { prisma } from "../lib/prisma.js";
import { publishRealtimeEvent } from "../lib/realtime.js";

const notificationSelect = {
  id: true,
  organizationId: true,
  incidentId: true,
  type: true,
  title: true,
  message: true,
  createdAt: true,
  readAt: true,
} as const;

export async function getUserNotifications(userId: string, organizationId: string) {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientId: userId, organizationId },
      select: notificationSelect,
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.notification.count({ where: { recipientId: userId, organizationId, readAt: null } }),
  ]);
  return { notifications, unreadCount };
}

export async function markNotificationRead(notificationId: string, userId: string, organizationId: string) {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, recipientId: userId, organizationId, readAt: null },
    data: { readAt: new Date() },
  });
  if (result.count === 0) {
    const existing = await prisma.notification.findFirst({
      where: { id: notificationId, recipientId: userId, organizationId },
      select: notificationSelect,
    });
    if (!existing) throw new Error("Notification not found");
    return existing;
  }
  await publishRealtimeEvent("NOTIFICATIONS_UPDATED", organizationId, { organizationId });
  return prisma.notification.findFirstOrThrow({
    where: { id: notificationId, recipientId: userId, organizationId },
    select: notificationSelect,
  });
}

export async function markAllNotificationsRead(userId: string, organizationId: string) {
  await prisma.notification.updateMany({
    where: { recipientId: userId, organizationId, readAt: null },
    data: { readAt: new Date() },
  });
  await publishRealtimeEvent("NOTIFICATIONS_UPDATED", organizationId, { organizationId });
  return { success: true };
}
