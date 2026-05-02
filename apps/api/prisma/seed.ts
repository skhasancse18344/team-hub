/**
 * TeamHub — Database Seeder
 * =========================
 * Run:  npm run db:seed   (from apps/api)
 *
 * What it creates
 * ---------------
 *  • 5 users  (1 owner, 2 admins, 2 members)           password: Password123!
 *  • 2 workspaces  (both owned by the same user)
 *  • Memberships across both workspaces
 *  • 6 goals with milestones and activity feed entries
 *  • 12 tasks spread across all Kanban columns
 *  • 3 announcements (one pinned) with reactions & comments
 *  • Notifications for each user
 *
 * Safe to re-run — uses upsert / createMany with skipDuplicates where possible.
 * Running against a non-empty DB will skip already-existing records by email/slug.
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

// ── Bootstrap Prisma (mirrors src/lib/db.ts) ─────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

// ── Helpers ───────────────────────────────────────────────────────────────────
const hash = (pw: string) => bcrypt.hash(pw, 12);

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function daysAgo(n: number): Date {
  return daysFromNow(-n);
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding TeamHub database…\n");

  // ── 1. Users ────────────────────────────────────────────────────────────────
  console.log("  → users");
  const PASSWORD = await hash("Password123!");

  const [alice, bob, carol, dave, eve] = await Promise.all([
    db.user.upsert({
      where:  { email: "alice@teamhub.dev" },
      update: {},
      create: {
        name:     "Alice Chen",
        email:    "alice@teamhub.dev",
        password: PASSWORD,
        avatarUrl: null,
      },
    }),
    db.user.upsert({
      where:  { email: "bob@teamhub.dev" },
      update: {},
      create: {
        name:     "Bob Martinez",
        email:    "bob@teamhub.dev",
        password: PASSWORD,
        avatarUrl: null,
      },
    }),
    db.user.upsert({
      where:  { email: "carol@teamhub.dev" },
      update: {},
      create: {
        name:     "Carol Zhang",
        email:    "carol@teamhub.dev",
        password: PASSWORD,
        avatarUrl: null,
      },
    }),
    db.user.upsert({
      where:  { email: "dave@teamhub.dev" },
      update: {},
      create: {
        name:     "Dave Okonkwo",
        email:    "dave@teamhub.dev",
        password: PASSWORD,
        avatarUrl: null,
      },
    }),
    db.user.upsert({
      where:  { email: "eve@teamhub.dev" },
      update: {},
      create: {
        name:     "Eve Larsson",
        email:    "eve@teamhub.dev",
        password: PASSWORD,
        avatarUrl: null,
      },
    }),
  ]);

  const users = { alice, bob, carol, dave, eve };
  console.log(`     created/found: ${Object.values(users).map(u => u.name).join(", ")}`);

  // ── 2. Workspaces ───────────────────────────────────────────────────────────
  console.log("  → workspaces");

  const ws1 = await db.workspace.upsert({
    where:  { slug: "product-team" },
    update: {},
    create: {
      name:        "Product Team",
      slug:        "product-team",
      description: "Core product engineering & design workspace",
      color:       "#6366f1",
    },
  });

  const ws2 = await db.workspace.upsert({
    where:  { slug: "growth-squad" },
    update: {},
    create: {
      name:        "Growth Squad",
      slug:        "growth-squad",
      description: "Marketing, growth experiments and analytics",
      color:       "#10b981",
    },
  });

  console.log(`     created/found: ${ws1.name}, ${ws2.name}`);

  // ── 3. Memberships ──────────────────────────────────────────────────────────
  console.log("  → memberships");

  // Product Team: alice=OWNER, bob=ADMIN, carol=ADMIN, dave=MEMBER, eve=MEMBER
  // Growth Squad: alice=OWNER, carol=ADMIN, eve=MEMBER
  const memberships = [
    { userId: alice.id, workspaceId: ws1.id, role: "OWNER"  as const },
    { userId: bob.id,   workspaceId: ws1.id, role: "ADMIN"  as const },
    { userId: carol.id, workspaceId: ws1.id, role: "ADMIN"  as const },
    { userId: dave.id,  workspaceId: ws1.id, role: "MEMBER" as const },
    { userId: eve.id,   workspaceId: ws1.id, role: "MEMBER" as const },
    { userId: alice.id, workspaceId: ws2.id, role: "OWNER"  as const },
    { userId: carol.id, workspaceId: ws2.id, role: "ADMIN"  as const },
    { userId: eve.id,   workspaceId: ws2.id, role: "MEMBER" as const },
  ];

  for (const m of memberships) {
    await db.membership.upsert({
      where:  { userId_workspaceId: { userId: m.userId, workspaceId: m.workspaceId } },
      update: {},
      create: m,
    });
  }

  console.log(`     ${memberships.length} memberships seeded`);

  // ── 4. Goals (Product Team) ──────────────────────────────────────────────────
  console.log("  → goals + milestones + activity");

  const goalData = [
    {
      title:       "Launch v2.0 of the mobile app",
      description: "Full redesign of the iOS & Android app with new onboarding flow.",
      status:      "IN_PROGRESS" as const,
      priority:    "HIGH"        as const,
      progress:    55,
      dueDate:     daysFromNow(45),
      ownerId:     alice.id,
      workspaceId: ws1.id,
      milestones: [
        { title: "Wireframes approved",         status: "COMPLETED"   as const, progress: 100, order: 0, dueDate: daysAgo(20) },
        { title: "Design system updated",       status: "COMPLETED"   as const, progress: 100, order: 1, dueDate: daysAgo(10) },
        { title: "API integration complete",    status: "IN_PROGRESS" as const, progress:  60, order: 2, dueDate: daysFromNow(14) },
        { title: "QA sign-off",                 status: "PENDING"     as const, progress:   0, order: 3, dueDate: daysFromNow(30) },
      ],
    },
    {
      title:       "Reduce API p95 latency to < 200 ms",
      description: "Profile slow endpoints and optimise N+1 queries across the board.",
      status:      "IN_PROGRESS" as const,
      priority:    "URGENT"      as const,
      progress:    30,
      dueDate:     daysFromNow(21),
      ownerId:     bob.id,
      workspaceId: ws1.id,
      milestones: [
        { title: "Profiling report",            status: "COMPLETED"   as const, progress: 100, order: 0, dueDate: daysAgo(5) },
        { title: "Fix top 10 slow queries",     status: "IN_PROGRESS" as const, progress:  40, order: 1, dueDate: daysFromNow(10) },
        { title: "Caching layer implemented",   status: "PENDING"     as const, progress:   0, order: 2, dueDate: daysFromNow(18) },
      ],
    },
    {
      title:       "Implement role-based access control",
      description: "Permission matrix for all resources, exposed to frontend.",
      status:      "COMPLETED"   as const,
      priority:    "HIGH"        as const,
      progress:    100,
      dueDate:     daysAgo(3),
      ownerId:     carol.id,
      workspaceId: ws1.id,
      milestones: [
        { title: "Permission registry defined", status: "COMPLETED" as const, progress: 100, order: 0, dueDate: daysAgo(14) },
        { title: "Middleware wired",            status: "COMPLETED" as const, progress: 100, order: 1, dueDate: daysAgo(8)  },
        { title: "Frontend can() helper",       status: "COMPLETED" as const, progress: 100, order: 2, dueDate: daysAgo(3)  },
      ],
    },
    {
      title:       "Set up CI/CD pipeline",
      description: "GitHub Actions for lint, type-check, build, and deploy on merge to main.",
      status:      "NOT_STARTED" as const,
      priority:    "MEDIUM"      as const,
      progress:    0,
      dueDate:     daysFromNow(60),
      ownerId:     dave.id,
      workspaceId: ws1.id,
      milestones: [
        { title: "Choose runner & secrets strategy", status: "PENDING" as const, progress: 0, order: 0, dueDate: daysFromNow(14) },
        { title: "Lint + type-check job",            status: "PENDING" as const, progress: 0, order: 1, dueDate: daysFromNow(21) },
        { title: "Deploy job with Railway",          status: "PENDING" as const, progress: 0, order: 2, dueDate: daysFromNow(45) },
      ],
    },
    // Growth Squad goals
    {
      title:       "Grow MRR by 20% this quarter",
      description: "Combination of pricing experiments, referral program, and outbound.",
      status:      "IN_PROGRESS" as const,
      priority:    "URGENT"      as const,
      progress:    40,
      dueDate:     daysFromNow(75),
      ownerId:     alice.id,
      workspaceId: ws2.id,
      milestones: [
        { title: "Pricing page A/B test live",  status: "COMPLETED"   as const, progress: 100, order: 0, dueDate: daysAgo(7) },
        { title: "Referral program launched",   status: "IN_PROGRESS" as const, progress:  50, order: 1, dueDate: daysFromNow(14) },
        { title: "Outbound sequence created",   status: "PENDING"     as const, progress:   0, order: 2, dueDate: daysFromNow(30) },
      ],
    },
    {
      title:       "Publish 12 SEO articles",
      description: "Target high-intent keywords for team collaboration + project management.",
      status:      "IN_PROGRESS" as const,
      priority:    "MEDIUM"      as const,
      progress:    25,
      dueDate:     daysFromNow(90),
      ownerId:     carol.id,
      workspaceId: ws2.id,
      milestones: [
        { title: "Keyword research done",       status: "COMPLETED"   as const, progress: 100, order: 0, dueDate: daysAgo(10) },
        { title: "First 3 articles published",  status: "IN_PROGRESS" as const, progress:  66, order: 1, dueDate: daysFromNow(7) },
        { title: "Articles 4–8 drafted",        status: "PENDING"     as const, progress:   0, order: 2, dueDate: daysFromNow(45) },
        { title: "Articles 9–12 published",     status: "PENDING"     as const, progress:   0, order: 3, dueDate: daysFromNow(88) },
      ],
    },
  ];

  const createdGoals = [];
  for (const { milestones, ...gd } of goalData) {
    const goal = await db.goal.create({ data: gd });
    createdGoals.push(goal);

    // milestones
    if (milestones.length) {
      await db.milestone.createMany({
        data: milestones.map(m => ({ ...m, goalId: goal.id })),
        skipDuplicates: true,
      });
    }

    // seed activity feed — CREATED entry
    await db.goalActivity.create({
      data: {
        goalId:  goal.id,
        userId:  gd.ownerId,
        type:    "CREATED",
        content: null,
      },
    });

    // extra status-change activity for in-progress / completed goals
    if (gd.status === "IN_PROGRESS" || gd.status === "COMPLETED") {
      await db.goalActivity.create({
        data: {
          goalId:  goal.id,
          userId:  gd.ownerId,
          type:    "STATUS_CHANGED",
          content: null,
          meta:    { from: "NOT_STARTED", to: gd.status },
        },
      });
    }
  }

  console.log(`     ${createdGoals.length} goals, ${goalData.reduce((s, g) => s + g.milestones.length, 0)} milestones`);

  // ── 5. Goal comments ────────────────────────────────────────────────────────
  console.log("  → goal comments");

  const goal1 = createdGoals[0]!;
  const goal2 = createdGoals[1]!;
  const goal3 = createdGoals[2]!;

  const goalComments = [
    { goalId: goal1.id, userId: bob.id,   content: "Wireframes look great — nice work @carol!" },
    { goalId: goal1.id, userId: carol.id, content: "API integration should be done by end of sprint." },
    { goalId: goal2.id, userId: alice.id, content: "Priority here — let's unblock the team." },
    { goalId: goal2.id, userId: dave.id,  content: "I can help with the caching layer." },
    { goalId: goal3.id, userId: alice.id, content: "Shipped! Great work Carol and the team." },
  ];

  for (const c of goalComments) {
    const comment = await db.comment.create({ data: c });
    // Log COMMENT_ADDED in the activity feed
    await db.goalActivity.create({
      data: {
        goalId:  c.goalId,
        userId:  c.userId,
        type:    "COMMENT_ADDED",
        content: c.content,
        meta:    { commentId: comment.id },
      },
    });
  }

  console.log(`     ${goalComments.length} goal comments`);

  // ── 6. Tasks (Action Items) ─────────────────────────────────────────────────
  console.log("  → tasks");

  const taskData = [
    // Product Team — ws1
    {
      title:       "Design new onboarding splash screen",
      description: "Three variant mockups for A/B testing.",
      status:      "DONE"        as const,
      priority:    "HIGH"        as const,
      assigneeId:  carol.id,
      goalId:      goal1.id,
      workspaceId: ws1.id,
      dueDate:     daysAgo(8),
    },
    {
      title:       "Implement refresh-token rotation",
      description: "httpOnly cookie, bcrypt hash stored in DB, 7-day expiry.",
      status:      "DONE"        as const,
      priority:    "URGENT"      as const,
      assigneeId:  alice.id,
      goalId:      null,
      workspaceId: ws1.id,
      dueDate:     daysAgo(5),
    },
    {
      title:       "Fix N+1 on /api/workspaces/:id/goals",
      description: "Include milestones and _count in a single Prisma query.",
      status:      "IN_REVIEW"   as const,
      priority:    "HIGH"        as const,
      assigneeId:  bob.id,
      goalId:      goal2.id,
      workspaceId: ws1.id,
      dueDate:     daysFromNow(2),
    },
    {
      title:       "Add Redis caching for permission lookups",
      description: "Cache /my-permissions responses with 5-minute TTL.",
      status:      "IN_PROGRESS" as const,
      priority:    "MEDIUM"      as const,
      assigneeId:  bob.id,
      goalId:      goal2.id,
      workspaceId: ws1.id,
      dueDate:     daysFromNow(7),
    },
    {
      title:       "Write unit tests for requirePermission middleware",
      description: "Cover all 35 permission keys across 3 roles.",
      status:      "TODO"        as const,
      priority:    "MEDIUM"      as const,
      assigneeId:  carol.id,
      goalId:      null,
      workspaceId: ws1.id,
      dueDate:     daysFromNow(10),
    },
    {
      title:       "Integrate Cloudinary webhook for failed uploads",
      description: "Handle upload errors gracefully and show toast.",
      status:      "TODO"        as const,
      priority:    "LOW"         as const,
      assigneeId:  dave.id,
      goalId:      null,
      workspaceId: ws1.id,
      dueDate:     daysFromNow(14),
    },
    {
      title:       "Socket.io reconnection state recovery",
      description: "Re-fetch diff of events missed during disconnect window.",
      status:      "TODO"        as const,
      priority:    "MEDIUM"      as const,
      assigneeId:  alice.id,
      goalId:      null,
      workspaceId: ws1.id,
      dueDate:     daysFromNow(21),
    },
    {
      title:       "Mobile app push notification setup",
      description: "Firebase FCM integration for iOS and Android.",
      status:      "CANCELLED"   as const,
      priority:    "LOW"         as const,
      assigneeId:  eve.id,
      goalId:      goal1.id,
      workspaceId: ws1.id,
      dueDate:     daysAgo(3),
    },
    // Growth Squad — ws2
    {
      title:       "Build referral landing page",
      description: "Unique link per user, tracks signups with UTM params.",
      status:      "IN_PROGRESS" as const,
      priority:    "HIGH"        as const,
      assigneeId:  eve.id,
      goalId:      createdGoals[4]!.id,
      workspaceId: ws2.id,
      dueDate:     daysFromNow(5),
    },
    {
      title:       "Draft keyword brief for article #1",
      description: "'Best project management tools for remote teams' — 2 400 searches/mo.",
      status:      "DONE"        as const,
      priority:    "MEDIUM"      as const,
      assigneeId:  carol.id,
      goalId:      createdGoals[5]!.id,
      workspaceId: ws2.id,
      dueDate:     daysAgo(9),
    },
    {
      title:       "Set up Plausible analytics on marketing site",
      description: "Cookie-free, GDPR compliant. Replace GA4.",
      status:      "TODO"        as const,
      priority:    "LOW"         as const,
      assigneeId:  alice.id,
      goalId:      null,
      workspaceId: ws2.id,
      dueDate:     daysFromNow(30),
    },
    {
      title:       "Cold-email sequence — 50 ICP companies",
      description: "3-step sequence via Instantly. Target VP Engineering.",
      status:      "IN_REVIEW"   as const,
      priority:    "URGENT"      as const,
      assigneeId:  alice.id,
      goalId:      createdGoals[4]!.id,
      workspaceId: ws2.id,
      dueDate:     daysFromNow(3),
    },
  ];

  await db.actionItem.createMany({ data: taskData, skipDuplicates: true });
  console.log(`     ${taskData.length} tasks`);

  // ── 7. Announcements ────────────────────────────────────────────────────────
  console.log("  → announcements + reactions + comments");

  const ann1 = await db.announcement.create({
    data: {
      title:       "🚀 v1.5 shipped — optimistic UI + RBAC",
      content:     "We just deployed v1.5 to production. Highlights:\n\n• Optimistic UI on Kanban board — drag-and-drop is now instant\n• Full RBAC system — 35 named permissions, enforced on both backend and frontend\n• Shared toast infrastructure for error rollbacks\n\nThanks to everyone who contributed! 🎉",
      isPinned:    true,
      authorId:    alice.id,
      workspaceId: ws1.id,
    },
  });

  const ann2 = await db.announcement.create({
    data: {
      title:       "Sprint planning — Monday 10:00 AM",
      content:     "Reminder: sprint planning is this Monday at 10 AM in the main meeting room.\n\nPlease review the backlog before the session and add estimates to your tickets. We'll be scoping the next two weeks and finalising the v2.0 mobile release timeline.",
      isPinned:    false,
      authorId:    bob.id,
      workspaceId: ws1.id,
    },
  });

  await db.announcement.create({
    data: {
      title:       "Q2 growth targets confirmed",
      content:     "The board has confirmed our Q2 targets:\n\n• +20% MRR\n• 500 new signups from SEO\n• Referral program live by end of April\n\nWe've broken these down into goals in the Growth Squad workspace. Let's go! 💪",
      isPinned:    false,
      authorId:    alice.id,
      workspaceId: ws2.id,
    },
  });

  // Reactions on ann1
  const reactionsAnn1 = [
    { userId: bob.id,   announcementId: ann1.id, emoji: "🎉" },
    { userId: carol.id, announcementId: ann1.id, emoji: "🎉" },
    { userId: dave.id,  announcementId: ann1.id, emoji: "🎉" },
    { userId: eve.id,   announcementId: ann1.id, emoji: "🔥" },
    { userId: bob.id,   announcementId: ann1.id, emoji: "👍" },
    { userId: carol.id, announcementId: ann1.id, emoji: "❤️" },
  ];
  await db.reaction.createMany({ data: reactionsAnn1, skipDuplicates: true });

  // Reactions on ann2
  const reactionsAnn2 = [
    { userId: carol.id, announcementId: ann2.id, emoji: "👍" },
    { userId: dave.id,  announcementId: ann2.id, emoji: "👍" },
    { userId: eve.id,   announcementId: ann2.id, emoji: "👍" },
  ];
  await db.reaction.createMany({ data: reactionsAnn2, skipDuplicates: true });

  // Comments on ann1
  const commentsAnn1 = [
    { announcementId: ann1.id, userId: bob.id,   content: "The drag-and-drop feels amazing now. Great work Alice!" },
    { announcementId: ann1.id, userId: carol.id, content: "RBAC was a big lift — glad it's shipped. The can() helper makes conditional rendering so clean." },
    { announcementId: ann1.id, userId: dave.id,  content: "Loving the toast rollbacks. Really helpful when the server rejects a move." },
    { announcementId: ann1.id, userId: eve.id,   content: "👏 Congrats team!" },
  ];
  await db.comment.createMany({ data: commentsAnn1, skipDuplicates: true });

  // Comments on ann2
  const commentsAnn2 = [
    { announcementId: ann2.id, userId: carol.id, content: "I'll have estimates ready. A few items need refinement first." },
    { announcementId: ann2.id, userId: eve.id,   content: "Added my items to the backlog." },
  ];
  await db.comment.createMany({ data: commentsAnn2, skipDuplicates: true });

  console.log(`     3 announcements, ${reactionsAnn1.length + reactionsAnn2.length} reactions, ${commentsAnn1.length + commentsAnn2.length} comments`);

  // ── 8. Notifications ────────────────────────────────────────────────────────
  console.log("  → notifications");

  const notifications = [
    // Announce notifications → all ws1 members (except author alice)
    { type: "ANNOUNCEMENT" as const, userId: bob.id,   actorId: alice.id, workspaceId: ws1.id, message: "Alice posted: 🚀 v1.5 shipped — optimistic UI + RBAC",  link: `/dashboard/announcements`, isRead: false },
    { type: "ANNOUNCEMENT" as const, userId: carol.id, actorId: alice.id, workspaceId: ws1.id, message: "Alice posted: 🚀 v1.5 shipped — optimistic UI + RBAC",  link: `/dashboard/announcements`, isRead: true  },
    { type: "ANNOUNCEMENT" as const, userId: dave.id,  actorId: alice.id, workspaceId: ws1.id, message: "Alice posted: 🚀 v1.5 shipped — optimistic UI + RBAC",  link: `/dashboard/announcements`, isRead: false },
    { type: "ANNOUNCEMENT" as const, userId: eve.id,   actorId: alice.id, workspaceId: ws1.id, message: "Alice posted: 🚀 v1.5 shipped — optimistic UI + RBAC",  link: `/dashboard/announcements`, isRead: false },
    // Goal update notification
    { type: "GOAL_UPDATE"   as const, userId: bob.id,   actorId: alice.id, workspaceId: ws1.id, message: "Goal 'Launch v2.0 of the mobile app' is now In Progress", link: `/dashboard/goals`, isRead: false },
    { type: "GOAL_UPDATE"   as const, userId: carol.id, actorId: carol.id, workspaceId: ws1.id, message: "Goal 'Implement RBAC' is now Completed",                  link: `/dashboard/goals`, isRead: true  },
    // Task assignment notifications
    { type: "ACTION_ASSIGNED" as const, userId: bob.id,   actorId: alice.id, workspaceId: ws1.id, message: "You were assigned: Fix N+1 on /api/workspaces/:id/goals",  link: `/dashboard/tasks`, isRead: false },
    { type: "ACTION_ASSIGNED" as const, userId: carol.id, actorId: alice.id, workspaceId: ws1.id, message: "You were assigned: Write unit tests for requirePermission",  link: `/dashboard/tasks`, isRead: false },
    { type: "ACTION_ASSIGNED" as const, userId: dave.id,  actorId: alice.id, workspaceId: ws1.id, message: "You were assigned: Integrate Cloudinary webhook",            link: `/dashboard/tasks`, isRead: true  },
    { type: "ACTION_ASSIGNED" as const, userId: eve.id,   actorId: alice.id, workspaceId: ws2.id, message: "You were assigned: Build referral landing page",             link: `/dashboard/tasks`, isRead: false },
    // Membership notification
    { type: "MEMBERSHIP"    as const, userId: dave.id,  actorId: alice.id, workspaceId: ws1.id, message: "You joined 'Product Team' as Member",                      link: `/dashboard/workspaces`, isRead: true },
    { type: "MEMBERSHIP"    as const, userId: eve.id,   actorId: alice.id, workspaceId: ws1.id, message: "You joined 'Product Team' as Member",                      link: `/dashboard/workspaces`, isRead: true },
  ];

  await db.notification.createMany({ data: notifications, skipDuplicates: true });
  console.log(`     ${notifications.length} notifications`);

  // ── Done ─────────────────────────────────────────────────────────────────────
  console.log("\n✅  Seed complete!\n");
  console.log("  Login credentials (all passwords: Password123!)");
  console.log("  ─────────────────────────────────────────────");
  console.log("  alice@teamhub.dev  — OWNER  of both workspaces");
  console.log("  bob@teamhub.dev    — ADMIN  of Product Team");
  console.log("  carol@teamhub.dev  — ADMIN  of both workspaces");
  console.log("  dave@teamhub.dev   — MEMBER of Product Team");
  console.log("  eve@teamhub.dev    — MEMBER of both workspaces");
  console.log("");
}

main()
  .catch((err) => {
    console.error("❌  Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
