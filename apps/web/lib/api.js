import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send httpOnly cookies on every request
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor ───────────────────────────────────────────────────────
// Nothing to inject (cookies are automatic via withCredentials).
// Hook here for future per-request logic (e.g. locale header, request IDs).
api.interceptors.request.use(
  (config) => config,
  (err)    => Promise.reject(err)
);

// ── Response interceptor ──────────────────────────────────────────────────────
// Handle 401 globally: if we get an Unauthorized response while on a protected
// page, clear local auth state and redirect to /login.
// We intentionally do NOT redirect during the initial /api/auth/me probe
// (which legitimately 401s when no session exists) — we guard by checking the
// current pathname instead of the store to avoid circular imports.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      (window.location.pathname.startsWith("/dashboard") ||
       window.location.pathname.startsWith("/profile"))
    ) {
      window.location.replace("/login");
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function loginRequest(email, password) {
  const { data } = await api.post("/api/auth/login", { email, password });
  return data.user;
}

export async function registerRequest(name, email, password) {
  const { data } = await api.post("/api/auth/register", { name, email, password });
  return data.user;
}

export async function logoutRequest() {
  await api.post("/api/auth/logout");
}

export async function meRequest() {
  const { data } = await api.get("/api/auth/me");
  return data.user;
}



export async function fetchProfile() {
  const { data } = await api.get("/api/profile");
  return data.user;
}

export async function updateProfile(payload) {
  const { data } = await api.patch("/api/profile", payload);
  return data.user;
}

// Step 1: ask the API for a signed Cloudinary upload signature
export async function fetchUploadSignature() {
  const { data } = await api.get("/api/profile/avatar/signature");
  return data;
}

// Step 2: upload the file directly to Cloudinary using the signature
export async function uploadToCloudinary(file, signatureData) {
  const { signature, timestamp, folder, publicId, cloudName, apiKey } =
    signatureData;

  const form = new FormData();
  form.append("file", file);
  form.append("signature", signature);
  form.append("timestamp", String(timestamp));
  form.append("api_key", apiKey);
  form.append("folder", folder);
  form.append("public_id", publicId);
  form.append("overwrite", "true");
  form.append("format", "jpg");
  form.append("transformation", "c_fill,g_face,h_400,w_400,q_auto");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: form }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? "Cloudinary upload failed");
  }

  const result = await res.json();
  return result.secure_url;
}

// Step 3: tell the API to persist the returned URL
export async function confirmAvatar(avatarUrl) {
  const { data } = await api.patch("/api/profile/avatar", { avatarUrl });
  return data.user;
}

export async function removeAvatar() {
  const { data } = await api.delete("/api/profile/avatar");
  return data.user;
}

// ─── Workspaces ───────────────────────────────────────────────────────────────

export async function fetchWorkspaces() {
  const { data } = await api.get("/api/workspaces");
  return data.workspaces;
}

export async function createWorkspaceReq(payload) {
  const { data } = await api.post("/api/workspaces", payload);
  return data.workspace;
}

export async function fetchWorkspace(id) {
  const { data } = await api.get(`/api/workspaces/${id}`);
  return data.workspace;
}

/** Returns { role, permissions: string[] } for the current user in a workspace */
export async function fetchMyPermissions(workspaceId) {
  const { data } = await api.get(`/api/workspaces/${workspaceId}/my-permissions`);
  return data; // { role, permissions }
}

export async function updateWorkspaceReq(id, payload) {
  const { data } = await api.patch(`/api/workspaces/${id}`, payload);
  return data.workspace;
}

export async function deleteWorkspaceReq(id) {
  await api.delete(`/api/workspaces/${id}`);
}

// ─── Members ──────────────────────────────────────────────────────────────────

export async function fetchMembers(workspaceId) {
  const { data } = await api.get(`/api/workspaces/${workspaceId}/members`);
  return data.members;
}

export async function updateMemberRoleReq(workspaceId, memberId, role) {
  const { data } = await api.patch(`/api/workspaces/${workspaceId}/members/${memberId}`, { role });
  return data.membership;
}

export async function removeMemberReq(workspaceId, memberId) {
  await api.delete(`/api/workspaces/${workspaceId}/members/${memberId}`);
}

export async function leaveWorkspaceReq(workspaceId) {
  await api.delete(`/api/workspaces/${workspaceId}/leave`);
}

// ─── Invites ──────────────────────────────────────────────────────────────────

export async function fetchInvites(workspaceId) {
  const { data } = await api.get(`/api/workspaces/${workspaceId}/invites`);
  return data.invites;
}

export async function inviteMemberReq(workspaceId, payload) {
  const { data } = await api.post(`/api/workspaces/${workspaceId}/invites`, payload);
  return data.invite;
}

export async function revokeInviteReq(workspaceId, inviteId) {
  await api.delete(`/api/workspaces/${workspaceId}/invites/${inviteId}`);
}

export async function fetchMyInvites() {
  const { data } = await api.get("/api/invites/pending");
  return data.invites;
}

export async function acceptInviteReq(token) {
  const { data } = await api.post(`/api/invites/${token}/accept`);
  return data.membership;
}

// ─── Goals ────────────────────────────────────────────────────────────────────

export async function fetchGoals(workspaceId, params = {}) {
  const { data } = await api.get(`/api/workspaces/${workspaceId}/goals`, { params });
  return data; // { goals, total, page, limit }
}

export async function createGoalReq(workspaceId, payload) {
  const { data } = await api.post(`/api/workspaces/${workspaceId}/goals`, payload);
  return data.goal;
}

export async function fetchGoal(workspaceId, goalId) {
  const { data } = await api.get(`/api/workspaces/${workspaceId}/goals/${goalId}`);
  return data.goal;
}

export async function updateGoalReq(workspaceId, goalId, payload) {
  const { data } = await api.patch(`/api/workspaces/${workspaceId}/goals/${goalId}`, payload);
  return data.goal;
}

export async function deleteGoalReq(workspaceId, goalId) {
  await api.delete(`/api/workspaces/${workspaceId}/goals/${goalId}`);
}

// ─── Milestones ───────────────────────────────────────────────────────────────

export async function createMilestoneReq(workspaceId, goalId, payload) {
  const { data } = await api.post(
    `/api/workspaces/${workspaceId}/goals/${goalId}/milestones`,
    payload
  );
  return data.milestone;
}

export async function updateMilestoneReq(workspaceId, goalId, milestoneId, payload) {
  const { data } = await api.patch(
    `/api/workspaces/${workspaceId}/goals/${goalId}/milestones/${milestoneId}`,
    payload
  );
  return { milestone: data.milestone, goalProgress: data.goalProgress };
}

export async function deleteMilestoneReq(workspaceId, goalId, milestoneId) {
  await api.delete(
    `/api/workspaces/${workspaceId}/goals/${goalId}/milestones/${milestoneId}`
  );
}

// ─── Goal activity + comments ─────────────────────────────────────────────────

export async function fetchGoalActivity(workspaceId, goalId, params = {}) {
  const { data } = await api.get(
    `/api/workspaces/${workspaceId}/goals/${goalId}/activity`,
    { params }
  );
  return data; // { activities, nextCursor }
}

export async function addCommentReq(workspaceId, goalId, content) {
  const { data } = await api.post(
    `/api/workspaces/${workspaceId}/goals/${goalId}/comments`,
    { content }
  );
  return data.activity;
}

export async function deleteCommentReq(workspaceId, goalId, activityId) {
  await api.delete(
    `/api/workspaces/${workspaceId}/goals/${goalId}/comments/${activityId}`
  );
}

// ─── Announcements ────────────────────────────────────────────────────────────

export async function fetchAnnouncements(workspaceId, params = {}) {
  const { data } = await api.get(`/api/workspaces/${workspaceId}/announcements`, { params });
  return data; // { announcements, total, page, limit }
}

export async function createAnnouncementReq(workspaceId, payload) {
  const { data } = await api.post(`/api/workspaces/${workspaceId}/announcements`, payload);
  return data.announcement;
}

export async function updateAnnouncementReq(workspaceId, annId, payload) {
  const { data } = await api.patch(`/api/workspaces/${workspaceId}/announcements/${annId}`, payload);
  return data.announcement;
}

export async function deleteAnnouncementReq(workspaceId, annId) {
  await api.delete(`/api/workspaces/${workspaceId}/announcements/${annId}`);
}

export async function pinAnnouncementReq(workspaceId, annId) {
  const { data } = await api.patch(`/api/workspaces/${workspaceId}/announcements/${annId}/pin`);
  return data.announcement;
}

export async function toggleReactionReq(workspaceId, annId, emoji) {
  const { data } = await api.post(
    `/api/workspaces/${workspaceId}/announcements/${annId}/reactions`,
    { emoji }
  );
  return data.reactions; // updated reactions array
}

export async function fetchAnnouncementComments(workspaceId, annId) {
  const { data } = await api.get(
    `/api/workspaces/${workspaceId}/announcements/${annId}/comments`
  );
  return data.comments;
}

export async function addAnnouncementCommentReq(workspaceId, annId, content) {
  const { data } = await api.post(
    `/api/workspaces/${workspaceId}/announcements/${annId}/comments`,
    { content }
  );
  return data.comment;
}

export async function deleteAnnouncementCommentReq(workspaceId, annId, commentId) {
  await api.delete(
    `/api/workspaces/${workspaceId}/announcements/${annId}/comments/${commentId}`
  );
}

// ─── Tasks (Action Items) ─────────────────────────────────────────────────────

export async function fetchTasks(workspaceId, params = {}) {
  const { data } = await api.get(`/api/workspaces/${workspaceId}/tasks`, { params });
  return data; // { items, total, page, limit }
}

export async function createTaskReq(workspaceId, payload) {
  const { data } = await api.post(`/api/workspaces/${workspaceId}/tasks`, payload);
  return data.item;
}

export async function updateTaskReq(workspaceId, itemId, payload) {
  const { data } = await api.patch(`/api/workspaces/${workspaceId}/tasks/${itemId}`, payload);
  return data.item;
}

export async function deleteTaskReq(workspaceId, itemId) {
  await api.delete(`/api/workspaces/${workspaceId}/tasks/${itemId}`);
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function fetchNotifications(params = {}) {
  const { data } = await api.get("/api/notifications", { params });
  return data; // { notifications, total, unreadCount, page, limit }
}

export async function fetchUnreadCount() {
  const { data } = await api.get("/api/notifications/unread-count");
  return data.count;
}

export async function markNotificationRead(id) {
  await api.patch(`/api/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
  await api.patch("/api/notifications/read-all");
}

export async function deleteNotificationReq(id) {
  await api.delete(`/api/notifications/${id}`);
}

export async function clearAllNotificationsReq() {
  await api.delete("/api/notifications");
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function fetchGoalAnalytics(workspaceId) {
  const { data } = await api.get(`/api/workspaces/${workspaceId}/analytics/goals`);
  return data; // { total, completedThisWeek, overdueCount, byStatus, weeklyCompletions }
}

/** Returns the CSV file as a Blob for browser download */
export async function exportGoalsCsvReq(workspaceId) {
  const res = await api.get(
    `/api/workspaces/${workspaceId}/analytics/goals/export`,
    { responseType: "blob" }
  );
  return res.data;
}
