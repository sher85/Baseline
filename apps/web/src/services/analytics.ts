export type TrendPoint = {
  anomalyCount: number;
  day: string;
  hrv: number | null;
  recoveryScore: number | null;
  restingHeartRate: number | null;
  sleepEfficiency: number | null;
  sleepSeconds: number | null;
  steps: number | null;
  temperatureDeviation: number | null;
};

export type TrendResponse = {
  generatedAt: string;
  range: {
    endDay: string;
    startDay: string;
  };
  series: TrendPoint[];
  summary: {
    averageHrv: number | null;
    averageRecoveryScore: number | null;
    averageSleepSeconds: number | null;
    daysWithAnomalies: number;
  };
  window: "7d" | "30d";
};

export type SleepResponse = {
  baseline: {
    durationDeltaSeconds: number | null;
    sleepDurationSeconds: number | null;
  };
  consistency: {
    averageClockMinutes: number;
    averageDeviationMinutes: number;
    latestOffsetMinutes: number;
    recent: Array<{
      bedtimeStart: string;
      clockMinutes: number;
      day: string;
      offsetMinutes: number;
    }>;
    status: "mixed" | "steady" | "variable" | "warming_up";
  } | null;
  day: string;
  note: string;
  timing: {
    bedtimeEnd: string | null;
    bedtimeStart: string | null;
  };
  totals: {
    efficiency: number | null;
    latencySeconds: number | null;
    sleepSeconds: number;
    timeInBedSeconds: number;
  };
  vitals: {
    averageHr: number | null;
    averageHrv: number | null;
    lowestHr: number | null;
  };
};

export type RecoveryDetailResponse = {
  anomalies: Array<{
    description: string;
    severity: "low" | "medium" | "high";
    title: string;
  }>;
  confidence: number | null;
  day: string;
  explanationSummary: string;
  factors: Array<{
    baselineValue: number | null;
    contribution: number | null;
    currentValue: number | null;
    detail: string;
    key: string;
    label: string;
    status: "positive" | "negative" | "neutral";
    unit: string;
  }>;
  score: number;
  vitals: {
    hrv: number | null;
    restingHeartRate: number | null;
    sleepSeconds: number;
    temperatureDeviation: number | null;
  };
};

export type RecentAnomalyResponse = {
  items: Array<{
    day: string;
    description: string;
    severity: "low" | "medium" | "high";
    title: string;
    type: string;
  }>;
};

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return fallback;
    }

    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export async function getTrendData(window: "7d" | "30d"): Promise<TrendResponse> {
  return fetchJson(`/api/trends?window=${window}`, {
    generatedAt: new Date(0).toISOString(),
    window,
    range: {
      startDay: new Date(0).toISOString(),
      endDay: new Date(0).toISOString()
    },
    summary: {
      averageRecoveryScore: null,
      averageSleepSeconds: null,
      averageHrv: null,
      daysWithAnomalies: 0
    },
    series: []
  });
}

export async function getSleepData(): Promise<SleepResponse | null> {
  return fetchJson("/api/sleep/latest", null);
}

export async function getRecoveryDetailData(): Promise<RecoveryDetailResponse | null> {
  return fetchJson("/api/recovery/latest/detail", null);
}

export async function getRecentAnomalyData(limit = 20): Promise<RecentAnomalyResponse> {
  return fetchJson(`/api/anomalies/recent?limit=${limit}`, {
    items: []
  });
}
