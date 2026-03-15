const DEFAULT_INITIAL_LOOKBACK_DAYS = 30;
const SAFE_RESYNC_LOOKBACK_DAYS = 3;

type SyncWindow = {
  endDate: string;
  startDate: string;
};

function asUtcDate(day: string) {
  return new Date(`${day}T00:00:00.000Z`);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(day: string, delta: number) {
  const date = asUtcDate(day);
  date.setUTCDate(date.getUTCDate() + delta);

  return formatDate(date);
}

export function resolveSyncWindowFromState(input: {
  endDate?: string;
  latestSyncedDay?: string | null;
  lookbackDays?: number;
  startDate?: string;
  today: string;
}): SyncWindow {
  if (input.startDate && input.endDate) {
    return {
      startDate: input.startDate,
      endDate: input.endDate
    };
  }

  const requestedEndDate = input.endDate ?? input.today;

  if (input.startDate) {
    return {
      startDate: input.startDate,
      endDate: requestedEndDate
    };
  }

  if (typeof input.lookbackDays === "number" && input.lookbackDays > 0) {
    return {
      startDate: addDays(requestedEndDate, -Math.max(input.lookbackDays - 1, 0)),
      endDate: requestedEndDate
    };
  }

  if (input.latestSyncedDay) {
    return {
      startDate: addDays(input.latestSyncedDay, -SAFE_RESYNC_LOOKBACK_DAYS),
      endDate: requestedEndDate
    };
  }

  return {
    startDate: addDays(requestedEndDate, -(DEFAULT_INITIAL_LOOKBACK_DAYS - 1)),
    endDate: requestedEndDate
  };
}
