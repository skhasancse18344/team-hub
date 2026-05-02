import { NotificationType } from "../../generated/prisma/client";
import { db } from "../lib/db";
import { emitToUser } from "../socket";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateNotificationInput {
  type: NotificationType;
  message: string;
  userId: string;      // recipient
  actorId?: string;
  workspaceId?: string;
  link?: string;
}

// Lightweight shape pushed over the socket (includes actor for avatar display)
export interface NotificationPayload {
  id: string;
  type: NotificationType;
  message: string;
  userId: string;
  actorId: string | null;
  workspaceId: string | null;
  isRead: boolean;
  link: string | null;
  createdAt: Date;
  actor: { id: string; name: string; avatarUrl: string | null } | null;
}

// ─── Create + push ────────────────────────────────────────────────────────────

export async function createNotification(
  input: CreateNotificationInput
): Promise<NotificationPayload> {
  const notification = await db.notification.create({
    data: {
      type:        input.type,
      message:     input.message,
      userId:      input.userId,
      actorId:     input.actorId ?? null,
      workspaceId: input.workspaceId ?? null,
      link:        input.link ?? null,
    },
    include: {
      actor: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  // Push to the recipient's personal socket room
  emitToUser(input.userId, "notification", notification);

  return notification as NotificationPayload;
}

// ─── Mention parsing ──────────────────────────────────────────────────────────

/**
 * Extract @Name tokens from comment content.
 * Supports multi-word names quoted as @[First Last] or simple @Word.
 * e.g. "Hey @Alice and @[Bob Smith], check this"
 * → ["Alice", "Bob Smith"]
 */
export function parseMentionNames(content: string): string[] {
  const names = new Set<string>();

  // @[Full Name] format
  const bracketed = content.matchAll(/@\[([^\]]+)\]/g);
  for (const m of bracketed) names.add(m[1]!.trim());

  // @Word format (stops at space/punctuation)
  const simple = content.matchAll(/@([A-Za-z][A-Za-z0-9_.-]*)/g);
  for (const m of simple) names.add(m[1]!.trim());

  return Array.from(names);
}

// ─── Process mentions in a comment ───────────────────────────────────────────

interface MentionContext {
  actorId: string;         // commenter
  actorName: string;
  workspaceId: string;
  /** e.g. "/dashboard/announcements" */
  link: string;
  /** Short description of the source: "an announcement" | "a goal" */
  sourceLabel: string;
}

export async function notifyMentions(
  content: string,
  ctx: MentionContext
): Promise<void> {
  const names = parseMentionNames(content);
  if (names.length === 0) return;

  // Fetch all workspace members at once
  const members = await db.membership.findMany({
    where: { workspaceId: ctx.workspaceId },
    include: { user: { select: { id: true, name: true } } },
  });

  const recipientIds = new Set<string>();

  for (const name of names) {
    const lower = name.toLowerCase();
    for (const m of members) {
      if (
        m.user.id !== ctx.actorId &&
        m.user.name.toLowerCase().includes(lower) &&
        !recipientIds.has(m.user.id)
      ) {
        recipientIds.add(m.user.id);
      }
    }
  }

  // Fire all notification creates concurrently
  await Promise.all(
    Array.from(recipientIds).map((uid) =>
      createNotification({
        type:        "MENTION",
        message:     `${ctx.actorName} mentioned you in ${ctx.sourceLabel}`,
        userId:      uid,
        actorId:     ctx.actorId,
        workspaceId: ctx.workspaceId,
        link:        ctx.link,
      })
    )
  );
}
