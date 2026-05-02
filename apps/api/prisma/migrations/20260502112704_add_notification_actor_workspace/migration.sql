-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "actorId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
