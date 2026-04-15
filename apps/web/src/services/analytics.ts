import { getApiBaseUrl } from "./api-base";

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

export type AnomalyHistoryResponse = {
  hasMore: boolean;
  items: Array<{
    anomalies: Array<{
      description: string;
      severity: "low" | "medium" | "high";
      title: string;
      type: string;
    }>;
    day: string;
    highestSeverity: "low" | "medium" | "high";
    severityCounts: {
      high: number;
      low: number;
      medium: number;
    };
  }>;
  nextCursorDay: string | null;
};

export type AnomalyHeatmapResponse = {
  categories: Array<{
    label: string;
    value: "all" | "sleep" | "hrv" | "resting_hr" | "temperature";
  }>;
  days: Array<{
    anomalyCount: number;
    date: string;
    score: number;
    severityBreakdown: {
      high: number;
      low: number;
      medium: number;
    };
    summaries: string[];
    types: Array<"sleep" | "hrv" | "resting_hr" | "temperature">;
  }>;
  filter: {
    category: "all" | "sleep" | "hrv" | "resting_hr" | "temperature";
    categoryLabel: string;
    range: "3m" | "6m" | "12m";
  };
  range: {
    endDay: string | null;
    startDay: string | null;
  };
};

const baseUrl = getApiBaseUrl();

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

export async function getAnomalyHistoryData(
  limitDays = 10,
  options?: {
    cursorDay?: string;
    targetDay?: string;
  }
): Promise<AnomalyHistoryResponse> {
  const params = new URLSearchParams({
    limitDays: String(limitDays)
  });

  if (options?.cursorDay) {
    params.set("cursorDay", options.cursorDay);
  }

  if (options?.targetDay) {
    params.set("targetDay", options.targetDay);
  }

  return fetchJson(`/api/anomalies/history?${params.toString()}`, {
    hasMore: false,
    items: [],
    nextCursorDay: null
  });
}

export async function getAnomalyHeatmapData(
  range: "3m" | "6m" | "12m",
  type: "all" | "sleep" | "hrv" | "resting_hr" | "temperature"
): Promise<AnomalyHeatmapResponse> {
  return fetchJson(`/api/anomalies/heatmap?range=${range}&type=${type}`, {
    categories: [
      { value: "all", label: "All anomalies" },
      { value: "sleep", label: "Sleep" },
      { value: "hrv", label: "HRV" },
      { value: "resting_hr", label: "Resting heart rate" },
      { value: "temperature", label: "Temperature" }
    ],
    days: [],
    filter: {
      category: type,
      categoryLabel: type,
      range
    },
    range: {
      endDay: null,
      startDay: null
    }
  });
}
