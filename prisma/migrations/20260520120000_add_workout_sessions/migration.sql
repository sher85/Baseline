CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "SyncSource" NOT NULL,
    "externalId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "activityType" TEXT NOT NULL,
    "sourceType" TEXT,
    "intensity" TEXT,
    "label" TEXT,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "calories" INTEGER,
    "distanceMeters" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkoutSession_source_externalId_key" ON "WorkoutSession"("source", "externalId");
CREATE INDEX "WorkoutSession_userId_day_idx" ON "WorkoutSession"("userId", "day");
CREATE INDEX "WorkoutSession_userId_activityType_day_idx" ON "WorkoutSession"("userId", "activityType", "day");

ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
