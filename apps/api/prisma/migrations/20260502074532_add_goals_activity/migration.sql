-- CreateEnum
CREATE TYPE "goal_activity_type" AS ENUM ('CREATED', 'UPDATED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'PROGRESS_UPDATED', 'MILESTONE_ADDED', 'MILESTONE_UPDATED', 'MILESTONE_COMPLETED', 'MILESTONE_DELETED', 'COMMENT_ADDED', 'COMMENT_DELETED');

-- AlterTable
ALTER TABLE "goals" ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "milestones" ADD COLUMN     "description" TEXT,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "goal_activities" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "goal_activity_type" NOT NULL,
    "content" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goal_activities_goalId_createdAt_idx" ON "goal_activities"("goalId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "goal_activities_userId_idx" ON "goal_activities"("userId");

-- AddForeignKey
ALTER TABLE "goal_activities" ADD CONSTRAINT "goal_activities_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_activities" ADD CONSTRAINT "goal_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
