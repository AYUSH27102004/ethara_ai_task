-- Persist member dashboard, review metadata, activity timeline, and task status history.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ActivityType') THEN
    CREATE TYPE "ActivityType" AS ENUM (
      'TASK_ASSIGNED',
      'STATUS_UPDATED',
      'TASK_COMPLETED',
      'REVIEW_RECEIVED',
      'RATING_UPDATED'
    );
  END IF;
END
$$;

ALTER TABLE "Task"
  ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Review"
  ADD COLUMN IF NOT EXISTS "strengths" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "improvements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE IF NOT EXISTS "ActivityLog" (
  "id" TEXT NOT NULL,
  "type" "ActivityType" NOT NULL,
  "message" TEXT,
  "actorId" TEXT,
  "memberId" TEXT NOT NULL,
  "taskId" TEXT,
  "projectId" TEXT,
  "reviewId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TaskHistory" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "status" "TaskStatus" NOT NULL,
  "changedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ActivityLog_memberId_createdAt_idx" ON "ActivityLog"("memberId", "createdAt");
CREATE INDEX IF NOT EXISTS "ActivityLog_taskId_idx" ON "ActivityLog"("taskId");
CREATE INDEX IF NOT EXISTS "TaskHistory_taskId_createdAt_idx" ON "TaskHistory"("taskId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ActivityLog_actorId_fkey') THEN
    ALTER TABLE "ActivityLog"
      ADD CONSTRAINT "ActivityLog_actorId_fkey"
      FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ActivityLog_memberId_fkey') THEN
    ALTER TABLE "ActivityLog"
      ADD CONSTRAINT "ActivityLog_memberId_fkey"
      FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ActivityLog_taskId_fkey') THEN
    ALTER TABLE "ActivityLog"
      ADD CONSTRAINT "ActivityLog_taskId_fkey"
      FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ActivityLog_projectId_fkey') THEN
    ALTER TABLE "ActivityLog"
      ADD CONSTRAINT "ActivityLog_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ActivityLog_reviewId_fkey') THEN
    ALTER TABLE "ActivityLog"
      ADD CONSTRAINT "ActivityLog_reviewId_fkey"
      FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TaskHistory_taskId_fkey') THEN
    ALTER TABLE "TaskHistory"
      ADD CONSTRAINT "TaskHistory_taskId_fkey"
      FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TaskHistory_changedById_fkey') THEN
    ALTER TABLE "TaskHistory"
      ADD CONSTRAINT "TaskHistory_changedById_fkey"
      FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
