import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { verifyAccessToken } from "../utils/token";
import { db } from "../lib/db";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnlineUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

// workspaceId → userId → { user, socketIds }
const onlineMap = new Map<string, Map<string, { user: OnlineUser; sockets: Set<string> }>>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCookies(cookieHeader: string): Record<string, string> {
  return Object.fromEntries(
    cookieHeader.split(";").flatMap((c) => {
      const idx = c.indexOf("=");
      if (idx === -1) return [];
      const k = c.slice(0, idx).trim();
      const v = decodeURIComponent(c.slice(idx + 1).trim());
      return [[k, v]];
    })
  );
}

function getOnlineUsers(workspaceId: string): OnlineUser[] {
  const wsMap = onlineMap.get(workspaceId);
  if (!wsMap) return [];
  return Array.from(wsMap.values()).map((entry) => entry.user);
}

function addOnlineUser(workspaceId: string, socketId: string, user: OnlineUser): boolean {
  if (!onlineMap.has(workspaceId)) {
    onlineMap.set(workspaceId, new Map());
  }
  const wsMap = onlineMap.get(workspaceId)!;
  const entry = wsMap.get(user.id);
  if (entry) {
    entry.sockets.add(socketId);
    return false; // was already online
  }
  wsMap.set(user.id, { user, sockets: new Set([socketId]) });
  return true; // newly online
}

function removeOnlineUser(workspaceId: string, socketId: string, userId: string): boolean {
  const wsMap = onlineMap.get(workspaceId);
  if (!wsMap) return false;
  const entry = wsMap.get(userId);
  if (!entry) return false;
  entry.sockets.delete(socketId);
  if (entry.sockets.size === 0) {
    wsMap.delete(userId);
    if (wsMap.size === 0) onlineMap.delete(workspaceId);
    return true; // went offline
  }
  return false; // still online via another tab
}

// ─── Module-level io reference ────────────────────────────────────────────────

let _io: Server | null = null;

export function getIO(): Server {
  if (!_io) throw new Error("Socket.io not initialized");
  return _io;
}

export function emitToWorkspace(workspaceId: string, event: string, data: unknown): void {
  if (!_io) return;
  _io.to(`workspace:${workspaceId}`).emit(event, data);
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  if (!_io) return;
  _io.to(`user:${userId}`).emit(event, data);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL ?? "http://localhost:3027",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  _io = io;

  // ── Auth middleware ──────────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie ?? "";
      const cookies = parseCookies(cookieHeader);
      const token = cookies["access_token"];

      if (!token) return next(new Error("Unauthorized"));

      const payload = verifyAccessToken(token);
      const user = await db.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, name: true, avatarUrl: true },
      });

      if (!user) return next(new Error("Unauthorized"));

      socket.data.user = user as OnlineUser;
      socket.data.joinedWorkspaces = new Set<string>();
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  // ── Connection handler ───────────────────────────────────────────────────────
  io.on("connection", (socket) => {
    const user: OnlineUser = socket.data.user;

    // Each socket automatically joins the user's personal notification room
    socket.join(`user:${user.id}`);

    // ── join_workspace ──────────────────────────────────────────────────────────
    socket.on("join_workspace", async (workspaceId: string) => {
      if (typeof workspaceId !== "string" || !workspaceId) return;

      try {
        const membership = await db.membership.findUnique({
          where: { userId_workspaceId: { userId: user.id, workspaceId } },
        });
        if (!membership) {
          socket.emit("error", "Not a workspace member");
          return;
        }

        socket.join(`workspace:${workspaceId}`);
        (socket.data.joinedWorkspaces as Set<string>).add(workspaceId);

        addOnlineUser(workspaceId, socket.id, user);
        io.to(`workspace:${workspaceId}`).emit("online_users", {
          workspaceId,
          users: getOnlineUsers(workspaceId),
        });
      } catch {
        socket.emit("error", "Failed to join workspace");
      }
    });

    // ── leave_workspace ─────────────────────────────────────────────────────────
    socket.on("leave_workspace", (workspaceId: string) => {
      if (typeof workspaceId !== "string" || !workspaceId) return;
      socket.leave(`workspace:${workspaceId}`);
      (socket.data.joinedWorkspaces as Set<string>).delete(workspaceId);
      removeOnlineUser(workspaceId, socket.id, user.id);
      io.to(`workspace:${workspaceId}`).emit("online_users", {
        workspaceId,
        users: getOnlineUsers(workspaceId),
      });
    });

    // ── disconnect ──────────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const joinedWorkspaces = socket.data.joinedWorkspaces as Set<string>;
      for (const workspaceId of joinedWorkspaces) {
        removeOnlineUser(workspaceId, socket.id, user.id);
        io.to(`workspace:${workspaceId}`).emit("online_users", {
          workspaceId,
          users: getOnlineUsers(workspaceId),
        });
      }
    });
  });

  return io;
}
