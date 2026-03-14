export type MetricDeltaDirection = "up" | "down" | "flat";

export type RecoveryBreakdown = {
  hrvContribution: number;
  restingHrContribution: number;
  sleepContribution: number;
  temperatureContribution: number;
};

export type OverviewMetric = {
  label: string;
  value: string;
  detail: string;
  direction?: MetricDeltaDirection;
};
