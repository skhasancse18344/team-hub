# TeamHub

A full-stack collaborative team management platform. Teams can track goals, manage tasks on a Kanban board, post announcements, invite members, and see each other's activity in real-time — all within isolated workspaces, each governed by a role-based permission system.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Features](#2-features)
3. [Architecture & Repository Structure](#3-architecture--repository-structure)
4. [How Socket.io Works in This App](#4-how-socketio-works-in-this-app)
5. [Advanced Feature 1 — Optimistic UI](#5-advanced-feature-1--optimistic-ui)
6. [Advanced Feature 2 — Advanced RBAC](#6-advanced-feature-2--advanced-rbac)
7. [Feature Impact Map](#7-feature-impact-map)
8. [Setup Instructions](#8-setup-instructions)
9. [Environment Variable Reference](#9-environment-variable-reference)
10. [API Route Reference](#10-api-route-reference)
11. [Known Limitations](#11-known-limitations)

---

## 1. Project Overview

TeamHub is a monorepo (Turborepo) containing:

| App / Package | Purpose |
|---|---|
| `apps/api` | Express 4 + TypeScript REST API, Socket.io server, Prisma 7 ORM |
| `apps/web` | Next.js 16 (App Router) frontend — all pages are JSX + CSS Modules |
| `packages/ui` | Shared React component library (Button, Card, …) |
| `packages/eslint-config` | Shared ESLint rule sets |
| `packages/typescript-config` | Shared `tsconfig` base files |

**Use case:** A small-to-medium engineering or product team that needs a single place to set quarterly goals, break them into milestones, create and assign tasks, broadcast team announcements, and see who is currently online — without context-switching to five different tools.

---

## 2. Features

### Authentication
- Register with name + email + password (bcrypt, 12 rounds)
- Login returns two JWTs: a 15-minute access token and a 7-day refresh token, both stored in **httpOnly cookies** (never accessible to JavaScript)
- Silent token refresh on every page load via `/api/auth/refresh`
- Logout invalidates the refresh token hash stored in the database

### Workspaces
- Create any number of workspaces; each has a unique auto-generated slug
- Switch between workspaces using the sidebar switcher — the entire app re-scopes instantly
- View and accept pending workspace invites from the Workspaces page

### Team Management
- See all members with their roles (Owner / Admin / Member)
- Admins can promote/demote members or remove them
- Owners can transfer ownership or delete the workspace
- Leave a workspace (unless you are the sole owner)

### Invites
- Admins generate a one-time invite link per email address
- Invite tokens expire; accepted invites cannot be reused
- Pending invites are listed and can be revoked before acceptance

### Goals
- Create goals with title, description, status, priority, due date, and owner
- Break a goal into **milestones**; each milestone has its own status and progress (0–100 %)
- Goal `progress` is automatically recalculated from milestone completion percentages
- Comment on a goal; comments appear in a reverse-chronological **activity feed** alongside system events (status changes, milestone completions, etc.)
- Filter by status and priority; paginate the list

### Tasks (Kanban Board)
- Five columns: **To Do → In Progress → In Review → Done → Cancelled**
- Drag a card across columns to move it; the status updates instantly (optimistic)
- Create / edit tasks with title, description, priority, due date, assignee, and linked goal
- Switch between **Kanban** and **List** view
- Filter by status, priority, or search by title

### Announcements
- Admins post announcements with a title and rich content
- Pin an announcement to keep it at the top of the feed
- Any member can react with one of six emoji reactions (toggle on/off)
- Comment threads on each announcement with delete support
- Real-time — a new announcement appears for all online members instantly

### Analytics
- Goal status breakdown pie chart
- Completed-goals-per-month bar chart (last 12 months)
- Four stat cards: total, completed, in-progress, at-risk goals
- Export current workspace goals to CSV

### Profile
- Update display name, email, and upload a profile photo (Cloudinary)

### Notifications
- In-app notification bell: mentions, goal updates, task assignments, announcements, membership events
- Mark individual notifications as read or clear all
- Unread badge count on the bell icon

### Online Presence
- A small avatar strip in the top-right of every dashboard page shows which teammates are currently online in the same workspace

---

## 3. Architecture & Repository Structure

```
team-hub/
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   │   └── schema.prisma          # Single source of truth for the DB schema
│   │   └── src/
│   │       ├── index.ts               # Express app + Socket.io bootstrap
│   │       ├── config/
│   │       │   ├── jwt.ts             # Token secrets + expiry config
│   │       │   └── permissions.ts     # RBAC permission registry (35 permissions)
│   │       ├── controllers/           # Route handlers (auth, workspace, goal, task, announcement, …)
│   │       ├── middleware/
│   │       │   ├── authenticate.ts    # JWT cookie verification
│   │       │   ├── requireWorkspaceRole.ts  # Role rank enforcement
│   │       │   └── requirePermission.ts     # Named-permission wrapper
│   │       ├── routes/                # Express routers
│   │       ├── utils/
│   │       │   ├── AppError.ts        # Typed error class
│   │       │   ├── rbac.ts            # hasPermission / assertPermission helpers
│   │       │   └── token.ts           # JWT sign / verify / cookie helpers
│   │       └── socket.ts              # Socket.io server + emitToWorkspace
│   │
│   └── web/
│       ├── app/
│       │   ├── (auth)/                # Login + signup pages
│       │   ├── dashboard/
│       │   │   ├── layout.jsx         # Sidebar, socket join, RBAC load, toast mount
│       │   │   ├── page.jsx           # Overview (stats + recent activity)
│       │   │   ├── goals/             # Goal list + detail pages
│       │   │   ├── tasks/             # Kanban board
│       │   │   ├── announcements/     # Announcement feed
│       │   │   ├── team/              # Member management
│       │   │   ├── workspaces/        # Workspace list + invite acceptance
│       │   │   └── analytics/         # Charts + CSV export
│       │   └── profile/               # Profile editor
│       ├── components/
│       │   ├── TaskToastRegion.jsx    # Global toast display (reads useToastStore)
│       │   ├── WorkspaceSwitcher.jsx
│       │   ├── OnlineUsers.jsx
│       │   ├── NotificationDropdown.jsx
│       │   └── InviteModal.jsx
│       ├── lib/
│       │   ├── api.js                 # All fetch helpers (axios wrapper)
│       │   └── useWorkspaceSocket.js  # Hook that wires all 13 socket events
│       └── store/                     # Zustand stores
│           ├── useAuthStore.js
│           ├── useWorkspaceStore.js
│           ├── useGoalStore.js        # Optimistic UI + _pending set
│           ├── useTaskStore.js        # Optimistic UI + _pending set
│           ├── useAnnouncementStore.js
│           ├── useNotificationStore.js
│           ├── useSocketStore.js
│           ├── useRbacStore.js        # RBAC cache + can() helper
│           └── useToastStore.js       # Global toast queue
│
└── packages/
    ├── eslint-config/
    ├── typescript-config/
    └── ui/
```

**Tech stack summary**

| Concern | Choice |
|---|---|
| Language (API) | TypeScript |
| Language (Web) | JavaScript (JSX) |
| ORM | Prisma 7 (PostgreSQL) |
| Auth | httpOnly cookies, JWT (access 15 min / refresh 7 d), bcrypt |
| State management | Zustand 5 |
| Real-time | Socket.io 4 |
| Charts | Recharts |
| File upload | Cloudinary |

---

## 4. How Socket.io Works in This App

### Server side

The Socket.io server is initialised on the shared `httpServer` in `apps/api/src/index.ts`. It exposes a single utility used by every controller:

```ts
emitToWorkspace(workspaceId, event, payload)
```

Every connected client that has joined the room `workspace:<workspaceId>` receives the event. This includes the user who triggered the action — which is why the frontend must identify and ignore its own echoes (see Section 5).

**Rooms** — when a client connects, it emits `join_workspace` with its `workspaceId`. The server calls `socket.join("workspace:<id>")`. Room membership is cleaned up automatically on disconnect.

**Presence** — the server tracks a `Map<workspaceId, Set<{id, name, avatarUrl}>>`. On `join_workspace` it broadcasts `online_users` to the entire room; on `disconnect` it removes the user and broadcasts again.

### Client side

`apps/web/lib/useWorkspaceSocket.js` is a React hook called once from `dashboard/layout.jsx`. It:

1. Calls `joinWorkspace(workspaceId)` when the active workspace changes
2. Registers **13 event handlers** grouped by domain:

| Domain | Events |
|---|---|
| Announcements | `new_announcement`, `announcement_updated`, `announcement_deleted`, `announcement_pinned`, `reaction_updated`, `comment_added`, `comment_deleted` |
| Tasks | `task_created`, `task_updated`, `task_deleted` |
| Goals | `goal_created`, `goal_updated`, `goal_deleted` |

3. Each handler checks `wsId !== workspaceId` and returns early if the event belongs to a different workspace (prevents cross-room leakage when switching workspaces mid-session)
4. Calls `socket.off(...)` for every event on unmount / workspace change (no memory leaks)

**Where it is mounted** — `useWorkspaceSocket` is called in `dashboard/layout.jsx`, which wraps every dashboard sub-page. There is no per-page socket setup; one connection is shared across the entire dashboard.

**What triggers a socket emission** — every mutating API endpoint (`POST`, `PATCH`, `DELETE`) on tasks, goals, and announcements calls `emitToWorkspace(...)` after the database write succeeds. The payload always includes `actorId: req.user.id` so the frontend can identify whether the event came from the current user.

---

## 5. Advanced Feature 1 — Optimistic UI

### What it is

Every mutating action (create, update, delete, move) on **Tasks** and **Goals** updates the UI _before_ the HTTP request completes. If the request fails, the UI rolls back to the exact state it was in before the action, and an error toast is shown.

### Why it matters

Users on slower connections see instant feedback instead of a frozen spinner. Drag-and-drop on the Kanban board feels native — dropping a card into a new column changes its status immediately without a loading state.

### How it works — the `_pending` Set

Each store (`useTaskStore`, `useGoalStore`) has a **module-level** `_pending` Set that lives _outside_ Zustand state (adding/removing IDs does not trigger re-renders):

```js
const _pending = new Set();   // outside create() — not in Zustand state
```

Every optimistic mutation follows this protocol:

```
1. _pending.add(itemId)             ← mark as in-flight
2. Apply optimistic patch to state  ← UI updates instantly
3. await HTTP call
   ✓ success → replace optimistic data with authoritative server response
   ✗ failure → revert to pre-mutation snapshot + push error toast
   finally: _pending.delete(itemId)
```

### Why `_pending` is needed — the socket echo problem

When the HTTP request succeeds, the backend emits a socket event to the entire workspace room — **including the sender**. Without `_pending`, this echo would overwrite the already-correct optimistic state with server data a second time, potentially causing a flicker or overwriting a second in-flight mutation.

The socket update handlers guard against this:

```js
_socketUpdate: (item) => {
  if (_pending.has(item.id)) return;   // our own in-flight HTTP — skip
  set((s) => ({ items: s.items.map((i) => (i.id === item.id ? item : i)) }));
},
```

### Conflict matrix

| Scenario | Result |
|---|---|
| HTTP response arrives before socket echo | Socket arrives → `_pending` hit → skipped. State already authoritative. |
| Socket echo arrives before HTTP response | Socket arrives → `_pending` hit → skipped. HTTP response then reconciles. |
| Another user edits the same item | Their `actorId` ≠ current user → not in `_pending` → socket applied immediately. |
| HTTP fails | State reverted to snapshot. Error toast shown. `_pending` cleared in `finally`. |
| Two users create the same item simultaneously | `_socketAdd` deduplicates by `id` — no duplicates inserted. |
| DELETE socket arrives for any item | Always applied (idempotent filter — no `_pending` check needed). |

### Rollback & toasts

A snapshot is captured before the optimistic patch:

```js
const prev = get().items.find((i) => i.id === itemId);
// ... optimistic patch ...
} catch {
  set((s) => ({ items: s.items.map((i) => (i.id === itemId ? prev : i)) }));
  useToastStore.getState().push("Failed to update task", "error", "task");
}
```

Toasts are pushed to `useToastStore` — a shared global queue. `<ToastRegion />` is mounted once in `dashboard/layout.jsx` and renders them in a fixed bottom-right panel with a slide-in animation.

### Where it is active

- `useTaskStore` — `createTask`, `updateTask`, `moveTask`, `deleteTask`
- `useGoalStore` — `createGoal`, `updateGoal`, `deleteGoal`
- Milestones are _not_ optimistic (they only appear inside an already-open detail view; the round-trip latency is acceptable)

---

## 6. Advanced Feature 2 — Advanced RBAC

### What it is

A named-permission system that maps every action in the app to the minimum role required. Both the backend middleware and the frontend conditional rendering share the same model. No hardcoded role strings are scattered across route files.

### The three roles

| Role | Rank | Can do |
|---|---|---|
| `OWNER` | 3 | Everything — including delete workspace and transfer ownership |
| `ADMIN` | 2 | Manage members, send/revoke invites, create/edit/delete/pin announcements, delete any goal or task |
| `MEMBER` | 1 | View everything, create their own goals and tasks, comment, react |

### Backend — `permissions.ts`

`apps/api/src/config/permissions.ts` is the single source of truth:

```ts
const PERMISSIONS: Record<PermissionKey, Role> = {
  "workspace:view":           "MEMBER",
  "workspace:update":         "ADMIN",
  "workspace:delete":         "OWNER",
  "invites:send":             "ADMIN",
  "announcements:create":     "ADMIN",
  "announcements:pin":        "ADMIN",
  "goals:create":             "MEMBER",
  "goals:delete_any":         "ADMIN",
  "tasks:create":             "MEMBER",
  // ... 35 permissions total
};
```

Adding a new permission is a one-line change here. No route files need to change.

### Backend — middleware chain

```
authenticate  →  requirePermission("invites:send")  →  controller
```

`requirePermission` looks up the minimum role from `PERMISSIONS`, then delegates to `requireWorkspaceRole(minRole)`, which:

1. Fetches the calling user's `Membership` record for this workspace
2. Compares `ROLE_RANK[membership.role]` against `ROLE_RANK[minRole]`
3. Returns `403` if insufficient; attaches `req.membership` on success

Owner-of-resource checks (e.g. "can edit own announcement, or any announcement if ADMIN") are handled inside controllers using `hasPermission` / `assertPermission` from `apps/api/src/utils/rbac.ts`.

### Frontend — `useRbacStore`

On every workspace switch, `dashboard/layout.jsx` calls:

```js
loadPermissions(activeWorkspace.id)
```

This hits `GET /api/workspaces/:id/my-permissions`, which returns the full list of `PermissionKey` strings the current user holds. Results are **cached** in a module-level `Map` (keyed by `workspaceId`) so the network request only fires once per workspace per browser session.

Components use the synchronous `can()` helper:

```jsx
const { can } = useRbacStore();

{can("announcements:create") && <button>New announcement</button>}
{can("invites:send")         && <InviteModal />}
{can("tasks:delete_any")     && <button onClick={handleDelete}>Delete</button>}
```

`can()` returns `false` while permissions are loading, so protected UI elements are hidden during the initial fetch rather than briefly visible.

On logout:

```js
resetRbac();   // clears Zustand state AND the module-level cache
```

---

## 7. Feature Impact Map

| Feature | Frontend stores / components | Backend | Real-time socket |
|---|---|---|---|
| Auth | `useAuthStore`, all pages | `/api/auth/*`, `authenticate` middleware | — |
| Workspace CRUD | `useWorkspaceStore`, `WorkspaceSwitcher` | `/api/workspaces` | — |
| Invite system | `InviteModal`, Workspaces page | `/api/workspaces/:id/invites`, `/api/invites/:token/accept` | — |
| Member management | Team page | `/api/workspaces/:id/members` | — |
| Goals | `useGoalStore` (optimistic + `_pending`) | `/api/workspaces/:id/goals` | `goal_created/updated/deleted` |
| Milestones | Goal detail page | `/api/workspaces/:id/goals/:id/milestones` | Indirectly via `goal_updated` |
| Tasks / Kanban | `useTaskStore` (optimistic + `_pending`) | `/api/workspaces/:id/tasks` | `task_created/updated/deleted` |
| Announcements | `useAnnouncementStore`, Announcements page | `/api/workspaces/:id/announcements` | 7 events |
| Reactions | Announcements page | `.../reactions` | `reaction_updated` |
| Comments | Announcements page, Goal detail | `.../comments` | `comment_added/deleted` |
| Analytics | Analytics page | `/api/workspaces/:id/analytics/goals` | — |
| CSV export | Analytics page | `/api/workspaces/:id/analytics/goals/export` | — |
| Notifications | `useNotificationStore`, `NotificationDropdown` | `/api/notifications` | — |
| Online presence | `OnlineUsers` | Socket `join_workspace` / `disconnect` | `online_users` |
| RBAC | `useRbacStore`, every page (`can()`) | `requirePermission`, `permissions.ts`, `/my-permissions` | — |
| Optimistic rollback | `_pending` Set, `useToastStore`, `ToastRegion` | `actorId` on every socket emission | Conflict guard via `_pending` |
| Profile / avatar | Profile page, `useProfileStore` | `/api/profile`, Cloudinary | — |

---

## 8. Setup Instructions

### Prerequisites

- Node.js >= 18
- PostgreSQL running locally (or a remote connection string)

### Steps

```bash
# 1. Clone and install
git clone https://github.com/skhasancse18344/team-hub.git
cd team-hub
npm install

# 2. Configure environment variables (see Section 9)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
# Edit each file with your real values

# 3. Run database migrations
cd apps/api
npx prisma migrate dev --name init

# 4. Start both apps from the repo root
cd ../..
npm run dev
```

The API starts at `http://localhost:4000` and the web app at `http://localhost:3000`.

### Seed demo data (optional)

After running migrations you can populate the database with realistic demo data:

```bash
cd apps/api
npm run db:seed
```

This creates two workspaces, five users, goals, tasks, announcements, reactions, and notifications so you can explore the app immediately.

#### Demo login credentials (all passwords: `Password123!`)

| Email | Role | Workspace(s) |
|---|---|---|
| alice@teamhub.dev | **OWNER** | Product Team, Growth Squad |
| bob@teamhub.dev | **ADMIN** | Product Team |
| carol@teamhub.dev | **ADMIN** | Product Team, Growth Squad |
| dave@teamhub.dev | **MEMBER** | Product Team |
| eve@teamhub.dev | **MEMBER** | Product Team, Growth Squad |

### Useful database commands (run from `apps/api`)

```bash
npm run db:migrate        # create + apply a new migration
npm run db:migrate:reset  # reset DB and replay all migrations (dev only)
npm run db:generate       # regenerate Prisma Client after schema changes
npm run db:studio         # open Prisma Studio — visual DB browser
npm run db:seed           # populate demo data
```

---

## 9. Environment Variable Reference

### `apps/api/.env`

| Variable | Required | Description | Example |
|---|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/teamhub` |
| `JWT_ACCESS_SECRET` | ✅ | Secret for signing 15-minute access tokens | any long random string |
| `JWT_REFRESH_SECRET` | ✅ | Secret for signing 7-day refresh tokens | a different long random string |
| `PORT` | — | API server port (default `4000`) | `4000` |
| `CLIENT_URL` | ✅ | CORS allowed origin (the web app URL) | `http://localhost:3000` |
| `NODE_ENV` | — | `development` or `production` | `development` |
| `CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary cloud name (profile photo uploads) | `my-cloud` |
| `CLOUDINARY_API_KEY` | ✅ | Cloudinary API key | `123456789` |
| `CLOUDINARY_API_SECRET` | ✅ | Cloudinary API secret | `abc...xyz` |

### `apps/web/.env.local`

| Variable | Required | Description | Example |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | API base URL for browser-side fetch calls | `http://localhost:4000` |
| `NEXT_PUBLIC_WS_URL` | ✅ | Socket.io server URL | `http://localhost:4000` |

---

## 10. API Route Reference

All routes under `/api/workspaces/:id/*` require a valid session cookie and workspace membership.

### Auth — `/api/auth`

| Method | Path | Description |
|---|---|---|
| `POST` | `/register` | Create account |
| `POST` | `/login` | Login — sets httpOnly cookies |
| `POST` | `/refresh` | Rotate access token using refresh cookie |
| `POST` | `/logout` | Invalidate refresh token, clear cookies |
| `GET` | `/me` | Return current user object |

### Profile — `/api/profile`

| Method | Path | Description |
|---|---|---|
| `PATCH` | `/` | Update name / email |
| `POST` | `/avatar` | Upload profile photo (Cloudinary) |

### Workspaces — `/api/workspaces`

| Method | Path | Min role | Description |
|---|---|---|---|
| `GET` | `/` | — | My workspaces |
| `POST` | `/` | — | Create workspace |
| `GET` | `/:id` | MEMBER | Get workspace details |
| `PATCH` | `/:id` | ADMIN | Update workspace |
| `DELETE` | `/:id` | OWNER | Delete workspace |
| `GET` | `/:id/members` | MEMBER | List members |
| `PATCH` | `/:id/members/:memberId` | ADMIN | Update member role |
| `DELETE` | `/:id/members/:memberId` | ADMIN | Remove member |
| `DELETE` | `/:id/leave` | MEMBER | Leave workspace |
| `GET` | `/:id/invites` | ADMIN | List pending invites |
| `POST` | `/:id/invites` | ADMIN | Send invite |
| `DELETE` | `/:id/invites/:inviteId` | ADMIN | Revoke invite |
| `GET` | `/:id/my-permissions` | MEMBER | Get my permission key list |

### Invites — `/api/invites`

| Method | Path | Description |
|---|---|---|
| `GET` | `/pending` | My pending invites |
| `POST` | `/:token/accept` | Accept an invite |

### Goals — `/api/workspaces/:id/goals`

| Method | Path | Min role | Description |
|---|---|---|---|
| `GET` | `/` | MEMBER | List goals (filterable, paginated) |
| `POST` | `/` | MEMBER | Create goal |
| `GET` | `/:goalId` | MEMBER | Get goal with milestones + activity |
| `PATCH` | `/:goalId` | MEMBER | Update goal |
| `DELETE` | `/:goalId` | MEMBER (own) / ADMIN (any) | Delete goal |
| `POST` | `/:goalId/milestones` | MEMBER | Add milestone |
| `PATCH` | `/:goalId/milestones/:milestoneId` | MEMBER | Update milestone |
| `DELETE` | `/:goalId/milestones/:milestoneId` | MEMBER | Delete milestone |
| `GET` | `/:goalId/activity` | MEMBER | Paginated activity + comment feed |
| `POST` | `/:goalId/comments` | MEMBER | Add comment |
| `DELETE` | `/:goalId/comments/:activityId` | MEMBER (own) / ADMIN (any) | Delete comment |

### Tasks — `/api/workspaces/:id/tasks`

| Method | Path | Min role | Description |
|---|---|---|---|
| `GET` | `/` | MEMBER | List tasks (filterable, paginated) |
| `POST` | `/` | MEMBER | Create task |
| `PATCH` | `/:itemId` | MEMBER | Update / move task |
| `DELETE` | `/:itemId` | MEMBER | Delete task |

### Announcements — `/api/workspaces/:id/announcements`

| Method | Path | Min role | Description |
|---|---|---|---|
| `GET` | `/` | MEMBER | List announcements |
| `POST` | `/` | ADMIN | Create announcement |
| `PATCH` | `/:annId` | ADMIN | Update announcement |
| `DELETE` | `/:annId` | ADMIN | Delete announcement |
| `PATCH` | `/:annId/pin` | ADMIN | Toggle pin |
| `POST` | `/:annId/reactions` | MEMBER | Toggle emoji reaction |
| `GET` | `/:annId/comments` | MEMBER | List comments |
| `POST` | `/:annId/comments` | MEMBER | Add comment |
| `DELETE` | `/:annId/comments/:commentId` | MEMBER (own) / ADMIN (any) | Delete comment |

### Analytics — `/api/workspaces/:id/analytics`

| Method | Path | Description |
|---|---|---|
| `GET` | `/goals` | Goal status breakdown + monthly completion stats |
| `GET` | `/goals/export` | Download goals as CSV |

### Notifications — `/api/notifications`

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | My notifications (paginated) |
| `PATCH` | `/:id/read` | Mark one as read |
| `PATCH` | `/read-all` | Mark all as read |
| `DELETE` | `/:id` | Delete one |
| `DELETE` | `/` | Delete all |

---

## 11. Known Limitations

| Area | Limitation |
|---|---|
| **Optimistic UI scope** | Milestones are not optimistic. Changes show a spinner and wait for the server before updating the UI. |
| **Offline support** | No service worker or offline queue. Actions taken while disconnected will fail and roll back. |
| **Socket reconnection** | If the Socket.io connection drops and reconnects, the client re-joins the workspace room but does not re-fetch missed events. Stale data can persist until the user navigates to the affected page. |
| **Permission caching** | `useRbacStore` caches permissions for the lifetime of the browser session. If an admin changes your role while you are logged in, the UI reflects the old permissions until you reload or log out. |
| **No task pagination on board** | The Kanban view loads all tasks for the workspace in a single request. Large workspaces may see slower initial loads. |
| **Invite delivery** | Invite links are shown on screen, not emailed. The invited user must receive the link through another channel. |
| **CSV export scope** | The analytics CSV export covers only goals, not tasks. |
| **No connection pooling** | No PgBouncer or managed pool is configured. High-concurrency production use would require adding one. |
| **No end-to-end tests** | There is no Playwright or Cypress suite. Only TypeScript type checking and ESLint run in CI. |
| **Notification push** | Notifications are written to the database but not pushed over the socket. The bell badge only updates when the dropdown is opened or the page is refreshed. |
