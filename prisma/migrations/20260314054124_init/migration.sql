-- CreateEnum
CREATE TYPE "SyncSource" AS ENUM ('oura');

-- CreateEnum
CREATE TYPE "SyncMode" AS ENUM ('manual', 'scheduled', 'backfill');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('pending', 'running', 'succeeded', 'failed');

-- CreateEnum
CREATE TYPE "AnomalySeverity" AS ENUM ('low', 'medium', 'high');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "externalIdentifier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OuraConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OuraConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "SyncSource" NOT NULL,
    "mode" "SyncMode" NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "rangeStart" TIMESTAMP(3),
    "rangeEnd" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySleep" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "totalSleepSeconds" INTEGER NOT NULL,
    "timeInBedSeconds" INTEGER NOT NULL,
    "sleepEfficiency" DOUBLE PRECISION,
    "sleepLatencySeconds" INTEGER,
    "averageHr" DOUBLE PRECISION,
    "lowestHr" DOUBLE PRECISION,
    "averageHrv" DOUBLE PRECISION,
    "bedtimeStart" TIMESTAMP(3),
    "bedtimeEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailySleep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyRecoveryInput" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "restingHeartRate" DOUBLE PRECISION,
    "hrv" DOUBLE PRECISION,
    "temperatureDeviation" DOUBLE PRECISION,
    "readinessEquivalent" DOUBLE PRECISION,
    "activityBalance" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyRecoveryInput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "activeCalories" INTEGER,
    "totalCalories" INTEGER,
    "steps" INTEGER,
    "equivalentWalkingDistance" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaselineSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "hrvBaseline" DOUBLE PRECISION,
    "restingHrBaseline" DOUBLE PRECISION,
    "temperatureBaseline" DOUBLE PRECISION,
    "sleepDurationBaseline" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaselineSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "score" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION,
    "hrvContribution" DOUBLE PRECISION,
    "restingHrContribution" DOUBLE PRECISION,
    "temperatureContribution" DOUBLE PRECISION,
    "sleepContribution" DOUBLE PRECISION,
    "explanationSummary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecoveryScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnomalyFlag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "severity" "AnomalySeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnomalyFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_externalIdentifier_key" ON "User"("externalIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "OuraConnection_userId_key" ON "OuraConnection"("userId");

-- CreateIndex
CREATE INDEX "SyncRun_userId_createdAt_idx" ON "SyncRun"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SyncRun_status_createdAt_idx" ON "SyncRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DailySleep_userId_day_idx" ON "DailySleep"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "DailySleep_userId_day_key" ON "DailySleep"("userId", "day");

-- CreateIndex
CREATE INDEX "DailyRecoveryInput_userId_day_idx" ON "DailyRecoveryInput"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "DailyRecoveryInput_userId_day_key" ON "DailyRecoveryInput"("userId", "day");

-- CreateIndex
CREATE INDEX "DailyActivity_userId_day_idx" ON "DailyActivity"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "DailyActivity_userId_day_key" ON "DailyActivity"("userId", "day");

-- CreateIndex
CREATE INDEX "BaselineSnapshot_userId_day_idx" ON "BaselineSnapshot"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "BaselineSnapshot_userId_day_key" ON "BaselineSnapshot"("userId", "day");

-- CreateIndex
CREATE INDEX "RecoveryScore_userId_day_idx" ON "RecoveryScore"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "RecoveryScore_userId_day_key" ON "RecoveryScore"("userId", "day");

-- CreateIndex
CREATE INDEX "AnomalyFlag_userId_day_idx" ON "AnomalyFlag"("userId", "day");

-- CreateIndex
CREATE INDEX "AnomalyFlag_severity_day_idx" ON "AnomalyFlag"("severity", "day");

-- AddForeignKey
ALTER TABLE "OuraConnection" ADD CONSTRAINT "OuraConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySleep" ADD CONSTRAINT "DailySleep_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyRecoveryInput" ADD CONSTRAINT "DailyRecoveryInput_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyActivity" ADD CONSTRAINT "DailyActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaselineSnapshot" ADD CONSTRAINT "BaselineSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryScore" ADD CONSTRAINT "RecoveryScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnomalyFlag" ADD CONSTRAINT "AnomalyFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
