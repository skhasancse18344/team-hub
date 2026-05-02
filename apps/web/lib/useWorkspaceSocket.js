"use client";
import { useEffect } from "react";
import { useSocketStore } from "../store/useSocketStore";
import { useAnnouncementStore } from "../store/useAnnouncementStore";
import { useTaskStore } from "../store/useTaskStore";

/**
 * Hook — call inside a component that knows the active workspaceId.
 * Joins the socket room and wires all real-time events for that workspace.
 * Cleans up (leaves room) on workspaceId change or unmount.
 */
export function useWorkspaceSocket(workspaceId) {
  const { socket, connected, joinWorkspace, leaveWorkspace } = useSocketStore();

  // ── Announcement handlers ────────────────────────────────────────────────────
  const addOrReplaceAnn = useAnnouncementStore((s) => s._socketAdd);
  const replaceAnn      = useAnnouncementStore((s) => s._socketUpdate);
  const removeAnn       = useAnnouncementStore((s) => s._socketDelete);
  const replaceReaction = useAnnouncementStore((s) => s._socketReaction);
  const addComment      = useAnnouncementStore((s) => s._socketAddComment);
  const deleteComment   = useAnnouncementStore((s) => s._socketDeleteComment);

  // ── Task handlers ────────────────────────────────────────────────────────────
  const addTask    = useTaskStore((s) => s._socketAdd);
  const replaceTask = useTaskStore((s) => s._socketUpdate);
  const removeTask  = useTaskStore((s) => s._socketDelete);

  useEffect(() => {
    if (!socket || !workspaceId) return;

    // Join this workspace's room
    joinWorkspace(workspaceId);

    // ── Announcement events ────────────────────────────────────────────────────
    function onNewAnnouncement({ workspaceId: wsId, announcement }) {
      if (wsId !== workspaceId) return;
      addOrReplaceAnn(announcement);
    }
    function onAnnouncementUpdated({ workspaceId: wsId, announcement }) {
      if (wsId !== workspaceId) return;
      replaceAnn(announcement);
    }
    function onAnnouncementDeleted({ workspaceId: wsId, announcementId }) {
      if (wsId !== workspaceId) return;
      removeAnn(announcementId);
    }
    function onAnnouncementPinned({ workspaceId: wsId, announcement }) {
      if (wsId !== workspaceId) return;
      replaceAnn(announcement);
    }
    function onReactionUpdated({ workspaceId: wsId, announcementId, reactions }) {
      if (wsId !== workspaceId) return;
      replaceReaction(announcementId, reactions);
    }
    function onCommentAdded({ workspaceId: wsId, announcementId, comment }) {
      if (wsId !== workspaceId) return;
      addComment(announcementId, comment);
    }
    function onCommentDeleted({ workspaceId: wsId, announcementId, commentId }) {
      if (wsId !== workspaceId) return;
      deleteComment(announcementId, commentId);
    }

    // ── Task events ────────────────────────────────────────────────────────────
    function onTaskCreated({ workspaceId: wsId, item }) {
      if (wsId !== workspaceId) return;
      addTask(item);
    }
    function onTaskUpdated({ workspaceId: wsId, item }) {
      if (wsId !== workspaceId) return;
      replaceTask(item);
    }
    function onTaskDeleted({ workspaceId: wsId, itemId }) {
      if (wsId !== workspaceId) return;
      removeTask(itemId);
    }

    socket.on("new_announcement",      onNewAnnouncement);
    socket.on("announcement_updated",  onAnnouncementUpdated);
    socket.on("announcement_deleted",  onAnnouncementDeleted);
    socket.on("announcement_pinned",   onAnnouncementPinned);
    socket.on("reaction_updated",      onReactionUpdated);
    socket.on("comment_added",         onCommentAdded);
    socket.on("comment_deleted",       onCommentDeleted);
    socket.on("task_created",          onTaskCreated);
    socket.on("task_updated",          onTaskUpdated);
    socket.on("task_deleted",          onTaskDeleted);

    return () => {
      socket.off("new_announcement",     onNewAnnouncement);
      socket.off("announcement_updated", onAnnouncementUpdated);
      socket.off("announcement_deleted", onAnnouncementDeleted);
      socket.off("announcement_pinned",  onAnnouncementPinned);
      socket.off("reaction_updated",     onReactionUpdated);
      socket.off("comment_added",        onCommentAdded);
      socket.off("comment_deleted",      onCommentDeleted);
      socket.off("task_created",         onTaskCreated);
      socket.off("task_updated",         onTaskUpdated);
      socket.off("task_deleted",         onTaskDeleted);

      leaveWorkspace(workspaceId);
    };
  }, [socket, workspaceId, connected]);
}
