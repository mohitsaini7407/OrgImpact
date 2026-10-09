import { Request, Response } from "express";
import {
  createDirectConversation,
  getAuthorizedConversation,
  listConversations,
  listMessages,
  markConversationRead,
  openTeamConversation,
} from "../services/chat.service.js";

export async function listConversationsController(req: Request, res: Response) {
  if (!req.organizationId || !req.userId) {
    res.status(403).json({ error: "Organization context is required" });
    return;
  }
  res.status(200).json(await listConversations(req.organizationId, req.userId));
}

export async function createDirectConversationController(req: Request, res: Response) {
  const { organizationId } = req;
  const { userId } = req.body as { userId: string };
  if (!organizationId || !req.userId) {
    res.status(403).json({ error: "Organization context is required" });
    return;
  }
  const conversation = await createDirectConversation(organizationId, req.userId, userId);
  res.status(200).json({ id: conversation.id });
}

export async function openTeamConversationController(req: Request, res: Response) {
  if (!req.organizationId || !req.userId || typeof req.params.teamId !== "string") {
    res.status(403).json({ error: "Organization context is required" });
    return;
  }
  const conversation = await openTeamConversation(req.organizationId, req.userId, req.params.teamId);
  if (!conversation) {
    res.status(404).json({ error: "Team channel not found" });
    return;
  }
  res.status(200).json({ id: conversation.id });
}

export async function listMessagesController(req: Request, res: Response) {
  if (!req.userId || typeof req.params.conversationId !== "string") {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const before = typeof req.query.before === "string" ? req.query.before : undefined;
  const messages = await listMessages(req.params.conversationId, req.userId, before);
  if (messages === null) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.status(200).json(messages);
}

export async function markConversationReadController(req: Request, res: Response) {
  if (!req.userId || typeof req.params.conversationId !== "string") {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const result = await markConversationRead(req.params.conversationId, req.userId);
  if (!result) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.status(200).json(result);
}

export async function authorizeConversationForUser(conversationId: string, userId: string) {
  return getAuthorizedConversation(conversationId, userId);
}
