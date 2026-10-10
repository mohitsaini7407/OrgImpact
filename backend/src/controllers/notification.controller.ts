import { Request, Response } from "express";
import { getUserNotifications, markAllNotificationsRead, markNotificationRead } from "../services/notification.service.js";

export async function getNotificationsController(req: Request, res: Response) {
  if (!req.userId || !req.organizationId) {
    res.status(403).json({ error: "Organization access is required" });
    return;
  }
  res.status(200).json(await getUserNotifications(req.userId, req.organizationId));
}

export async function markNotificationReadController(req: Request, res: Response) {
  const notificationId = req.params.notificationId;
  if (typeof notificationId !== "string" || !req.userId || !req.organizationId) {
    res.status(400).json({ error: "Notification ID and organization access are required" });
    return;
  }
  res.status(200).json(await markNotificationRead(notificationId, req.userId, req.organizationId));
}

export async function markAllNotificationsReadController(req: Request, res: Response) {
  if (!req.userId || !req.organizationId) {
    res.status(403).json({ error: "Organization access is required" });
    return;
  }
  res.status(200).json(await markAllNotificationsRead(req.userId, req.organizationId));
}
