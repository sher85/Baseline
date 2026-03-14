import { env } from "../../config/env.js";
import { getOuraConnectionStatus } from "../oura/oura-connection.service.js";
import { runScheduledOuraSync } from "../sync/oura-sync.service.js";

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

type DailyCronSchedule = {
  hour: number;
  minute: number;
};

type ScheduledOuraSyncController = {
  nextRunAt: Date | null;
  stop: () => void;
};

function parseDailyCronExpression(expression: string): DailyCronSchedule | null {
  const [minutePart, hourPart, dayPart, monthPart, weekdayPart] = expression.trim().split(/\s+/);

  if (
    !minutePart ||
    !hourPart ||
    !dayPart ||
    !monthPart ||
    !weekdayPart ||
    dayPart !== "*" ||
    monthPart !== "*" ||
    weekdayPart !== "*"
  ) {
    return null;
  }

  const minute = Number.parseInt(minutePart, 10);
  const hour = Number.parseInt(hourPart, 10);

  if (
    !Number.isInteger(minute) ||
    !Number.isInteger(hour) ||
    minute < 0 ||
    minute > 59 ||
    hour < 0 ||
    hour > 23
  ) {
    return null;
  }

  return { hour, minute };
}

function getNextRunAt(schedule: DailyCronSchedule, reference = new Date()) {
  const nextRunAt = new Date(reference);
  nextRunAt.setSeconds(0, 0);
  nextRunAt.setHours(schedule.hour, schedule.minute, 0, 0);

  if (nextRunAt.getTime() <= reference.getTime()) {
    nextRunAt.setTime(nextRunAt.getTime() + MS_PER_DAY);
  }

  return nextRunAt;
}

async function runScheduledSyncSafely(trigger: string) {
  try {
    const connection = await getOuraConnectionStatus();

    if (!connection.configured || !connection.connected) {
      console.log(`[scheduler] Skipping ${trigger} Oura sync because no active connection is available.`);
      return;
    }

    const result = await runScheduledOuraSync();
    console.log(
      `[scheduler] Scheduled Oura sync succeeded for ${result.window.startDate} to ${result.window.endDate}.`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scheduled sync error";
    console.error(`[scheduler] Scheduled Oura sync failed: ${message}`);
  }
}

export function startScheduledOuraSync(): ScheduledOuraSyncController {
  if (!env.SYNC_SCHEDULE_ENABLED) {
    console.log("[scheduler] Scheduled sync is disabled.");

    return {
      nextRunAt: null,
      stop: () => undefined
    };
  }

  const schedule = parseDailyCronExpression(env.SYNC_SCHEDULE_CRON);

  if (!schedule) {
    console.warn(
      `[scheduler] Unsupported SYNC_SCHEDULE_CRON "${env.SYNC_SCHEDULE_CRON}". Expected "minute hour * * *".`
    );

    return {
      nextRunAt: null,
      stop: () => undefined
    };
  }

  let timeout: NodeJS.Timeout | null = null;
  let stopped = false;
  let nextRunAt = getNextRunAt(schedule);

  const scheduleNextRun = () => {
    if (stopped) {
      return;
    }

    nextRunAt = getNextRunAt(schedule);
    const delayMs = Math.max(nextRunAt.getTime() - Date.now(), MS_PER_MINUTE);

    console.log(`[scheduler] Next Oura sync scheduled for ${nextRunAt.toISOString()}.`);

    timeout = setTimeout(async () => {
      await runScheduledSyncSafely("scheduled");
      scheduleNextRun();
    }, delayMs);
  };

  if (env.SYNC_SCHEDULE_RUN_ON_START) {
    void runScheduledSyncSafely("startup");
  }

  scheduleNextRun();

  return {
    get nextRunAt() {
      return nextRunAt;
    },
    stop() {
      stopped = true;

      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
    }
  };
}
