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
  };
  day: string;
  generatedAt: string;
  metrics: OverviewMetric[];
  notes: string[];
  source: "fallback" | "live";
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
    configured: false
  }
};

export async function getOverviewData(): Promise<OverviewResponse> {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

  try {
    const response = await fetch(`${baseUrl}/api/overview/latest`, {
      cache: "no-store"
    });

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
