import { getApiBaseUrl } from "./api-base";

type OverviewMetric = {
  detail: string;
  label: string;
  value: string;
};

type OverviewAnomaly = {
  description: string;
  severity: "low" | "medium" | "high";
  title: string;
};

export type OverviewResponse = {
  anomalies: OverviewAnomaly[];
  connection: {
    configured: boolean;
    connected: boolean;
    needsReconnect?: boolean;
  };
  day: string;
  generatedAt: string;
  metrics: OverviewMetric[];
  notes: string[];
  source: "empty" | "fallback" | "live";
  sync: {
    lastSyncedAt: string | null;
    latestStatus: string;
    running: boolean;
  };
};

const fallbackOverview: OverviewResponse = {
  generatedAt: new Date(0).toISOString(),
  day: new Date(0).toISOString(),
  metrics: [
    { label: "Recovery", value: "--", detail: "API unavailable" },
    { label: "HRV", value: "--", detail: "API unavailable" },
    { label: "Resting HR", value: "--", detail: "API unavailable" },
    { label: "Sleep", value: "--", detail: "API unavailable" }
  ],
  notes: [
    "The API is not reachable yet.",
    "Start the local backend to replace placeholder data.",
    "Once connected, this dashboard will render live recovery analytics."
  ],
  anomalies: [],
  source: "fallback",
  sync: {
    running: false,
    latestStatus: "offline",
    lastSyncedAt: null
  },
  connection: {
    connected: false,
    configured: false,
    needsReconnect: false
  }
};

const emptyOverview: OverviewResponse = {
  generatedAt: new Date(0).toISOString(),
  day: new Date(0).toISOString(),
  metrics: [
    { label: "Recovery", value: "--", detail: "No synced data yet" },
    { label: "HRV", value: "--", detail: "No synced data yet" },
    { label: "Resting HR", value: "--", detail: "No synced data yet" },
    { label: "Sleep", value: "--", detail: "No synced data yet" }
  ],
  notes: [
    "The API is reachable, but no analytics have been stored yet.",
    "Run the demo seed or sync Oura locally to populate the dashboard.",
    "Once data lands, this overview will switch from placeholders to live analytics."
  ],
  anomalies: [],
  source: "empty",
  sync: {
    running: false,
    latestStatus: "no-data",
    lastSyncedAt: null
  },
  connection: {
    connected: false,
    configured: false,
    needsReconnect: false
  }
};

export async function getOverviewData(): Promise<OverviewResponse> {
  const baseUrl = getApiBaseUrl();

  try {
    const response = await fetch(`${baseUrl}/api/overview/latest`, {
      cache: "no-store"
    });

    if (response.status === 404) {
      return emptyOverview;
    }

    if (!response.ok) {
      return fallbackOverview;
    }

    return {
      ...(await response.json()),
      source: "live"
    } as OverviewResponse;
  } catch {
    return fallbackOverview;
  }
}
