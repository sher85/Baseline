import { z } from "../lib/zod-openapi.js";

const isoDateSchema = z.string().date();
const isoDateTimeSchema = z.string().datetime();
const nullableDateTimeSchema = isoDateTimeSchema.nullable();
const nullableNumberSchema = z.number().nullable();

export const syncModeValues = ["manual", "scheduled", "backfill"] as const;
export const syncStatusValues = ["pending", "running", "succeeded", "failed"] as const;
export const anomalySeverityValues = ["low", "medium", "high"] as const;
export const anomalyCategoryValues = ["all", "sleep", "hrv", "resting_hr", "temperature"] as const;
const anomalyHeatmapTypeValues = ["sleep", "hrv", "resting_hr", "temperature"] as const;
export const anomalyRangeValues = ["3m", "6m", "12m"] as const;
export const trendWindowValues = ["7d", "30d"] as const;

const fieldErrorsSchema = z.record(z.string(), z.array(z.string()).optional());

export const errorResponseSchema = z.object({
  error: z.string()
});

export const validationIssuesSchema = z.object({
  formErrors: z.array(z.string()),
  fieldErrors: fieldErrorsSchema
});

export const validationErrorResponseSchema = errorResponseSchema.extend({
  issues: validationIssuesSchema
});

export const syncErrorResponseSchema = errorResponseSchema.extend({
  reauthenticationRequired: z.literal(true).optional()
});

export const manualSyncBodySchema = z
  .object({
    startDate: isoDateSchema.optional(),
    endDate: isoDateSchema.optional(),
    lookbackDays: z.coerce.number().int().positive().max(365).optional()
  })
  .refine(
    (value) => {
      if (value.startDate && value.endDate) {
        return value.startDate <= value.endDate;
      }

      return true;
    },
    {
      message: "startDate must be earlier than or equal to endDate",
      path: ["startDate"]
    }
  );

export const backfillSyncBodySchema = z
  .object({
    startDate: isoDateSchema,
    endDate: isoDateSchema
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: "startDate must be earlier than or equal to endDate",
    path: ["startDate"]
  });

export const callbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  error: z.string().min(1).optional(),
  scope: z.string().optional(),
  state: z.string().min(1).optional()
});

export const trendWindowQuerySchema = z.object({
  window: z.enum(trendWindowValues)
});

export const anomaliesRecentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(60).optional()
});

export const anomaliesHistoryQuerySchema = z.object({
  limitDays: z.coerce.number().int().min(1).max(366).optional(),
  cursorDay: isoDateSchema.optional(),
  targetDay: isoDateSchema.optional()
});

export const anomalyHeatmapQuerySchema = z.object({
  range: z.enum(anomalyRangeValues),
  type: z.enum(anomalyCategoryValues)
});

const recentEntrySchema = z.object({
  day: isoDateTimeSchema,
  bedtimeStart: isoDateTimeSchema,
  clockMinutes: z.number().int(),
  offsetMinutes: z.number().int()
});

const anomalySummarySchema = z.object({
  severity: z.enum(anomalySeverityValues),
  title: z.string(),
  description: z.string()
});

const storedAnomalySchema = z.object({
  id: z.string(),
  userId: z.string(),
  day: isoDateTimeSchema,
  type: z.string(),
  severity: z.enum(anomalySeverityValues),
  title: z.string(),
  description: z.string(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

const syncRunSchema = z.object({
  id: z.string(),
  userId: z.string(),
  source: z.literal("oura"),
  mode: z.enum(syncModeValues),
  status: z.enum(syncStatusValues),
  rangeStart: nullableDateTimeSchema,
  rangeEnd: nullableDateTimeSchema,
  startedAt: nullableDateTimeSchema,
  finishedAt: nullableDateTimeSchema,
  errorMessage: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

const baselineSnapshotSchema = z.object({
  id: z.string(),
  userId: z.string(),
  day: isoDateTimeSchema,
  hrvBaseline: nullableNumberSchema,
  restingHrBaseline: nullableNumberSchema,
  temperatureBaseline: nullableNumberSchema,
  sleepDurationBaseline: nullableNumberSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

const recoveryScoreSchema = z.object({
  id: z.string(),
  userId: z.string(),
  day: isoDateTimeSchema,
  score: z.number().int(),
  confidence: nullableNumberSchema,
  hrvContribution: nullableNumberSchema,
  restingHrContribution: nullableNumberSchema,
  temperatureContribution: nullableNumberSchema,
  sleepContribution: nullableNumberSchema,
  explanationSummary: z.string(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

const rootStatusSchema = z.object({
  name: z.string(),
  status: z.string(),
  docs: z.string()
});

const healthResponseSchema = z.object({
  ok: z.boolean(),
  service: z.string(),
  timestamp: isoDateTimeSchema
});

const healthDbSuccessSchema = z.object({
  ok: z.literal(true),
  database: z.literal("reachable")
});

const healthDbFailureSchema = z.object({
  ok: z.literal(false),
  database: z.literal("unreachable"),
  error: z.string()
});

const overviewMetricSchema = z.object({
  label: z.string(),
  value: z.string(),
  detail: z.string()
});

const overviewResponseSchema = z.object({
  generatedAt: isoDateTimeSchema,
  day: isoDateTimeSchema,
  metrics: z.array(overviewMetricSchema),
  notes: z.array(z.string()),
  anomalies: z.array(anomalySummarySchema),
  sync: z.object({
    running: z.boolean(),
    latestStatus: z.union([z.enum(syncStatusValues), z.literal("idle")]),
    lastSyncedAt: nullableDateTimeSchema
  }),
  connection: z.object({
    connected: z.boolean(),
    configured: z.boolean(),
    needsReconnect: z.boolean()
  })
});

const sleepSummarySchema = z.object({
  day: isoDateTimeSchema,
  totals: z.object({
    sleepSeconds: z.number().int(),
    timeInBedSeconds: z.number().int(),
    efficiency: nullableNumberSchema,
    latencySeconds: z.number().int().nullable()
  }),
  vitals: z.object({
    averageHr: nullableNumberSchema,
    lowestHr: nullableNumberSchema,
    averageHrv: nullableNumberSchema
  }),
  timing: z.object({
    bedtimeStart: nullableDateTimeSchema,
    bedtimeEnd: nullableDateTimeSchema
  }),
  baseline: z.object({
    sleepDurationSeconds: nullableNumberSchema,
    durationDeltaSeconds: nullableNumberSchema
  }),
  consistency: z
    .object({
      averageClockMinutes: z.number().int(),
      averageDeviationMinutes: z.number().int(),
      latestOffsetMinutes: z.number().int(),
      recent: z.array(recentEntrySchema),
      status: z.enum(["mixed", "steady", "variable", "warming_up"])
    })
    .nullable(),
  note: z.string()
});

const recoveryDetailSchema = z.object({
  day: isoDateTimeSchema,
  score: z.number().int(),
  confidence: nullableNumberSchema,
  explanationSummary: z.string(),
  vitals: z.object({
    hrv: nullableNumberSchema,
    restingHeartRate: nullableNumberSchema,
    temperatureDeviation: nullableNumberSchema,
    sleepSeconds: z.number().int()
  }),
  factors: z.array(
    z.object({
      key: z.enum(["hrv", "restingHeartRate", "sleepDuration", "temperature"]),
      label: z.string(),
      contribution: nullableNumberSchema,
      status: z.enum(["positive", "negative", "neutral"]),
      currentValue: nullableNumberSchema,
      baselineValue: nullableNumberSchema,
      unit: z.string(),
      detail: z.string()
    })
  ),
  anomalies: z.array(anomalySummarySchema)
});

const trendSummarySchema = z.object({
  generatedAt: isoDateTimeSchema,
  window: z.enum(trendWindowValues),
  range: z.object({
    startDay: isoDateSchema,
    endDay: isoDateSchema
  }),
  summary: z.object({
    averageRecoveryScore: nullableNumberSchema,
    averageSleepSeconds: nullableNumberSchema,
    averageHrv: nullableNumberSchema,
    daysWithAnomalies: z.number().int()
  }),
  series: z.array(
    z.object({
      day: isoDateSchema,
      recoveryScore: nullableNumberSchema,
      sleepSeconds: nullableNumberSchema,
      sleepEfficiency: nullableNumberSchema,
      hrv: nullableNumberSchema,
      restingHeartRate: nullableNumberSchema,
      temperatureDeviation: nullableNumberSchema,
      steps: nullableNumberSchema,
      anomalyCount: z.number().int()
    })
  )
});

const anomalyHistoryEntrySchema = z.object({
  type: z.string(),
  title: z.string(),
  description: z.string(),
  severity: z.enum(anomalySeverityValues)
});

const anomalyHistoryResponseSchema = z.object({
  items: z.array(
    z.object({
      day: isoDateSchema,
      anomalies: z.array(anomalyHistoryEntrySchema),
      highestSeverity: z.enum(anomalySeverityValues),
      severityCounts: z.object({
        high: z.number().int(),
        medium: z.number().int(),
        low: z.number().int()
      })
    })
  ),
  hasMore: z.boolean(),
  nextCursorDay: isoDateSchema.nullable()
});

const anomalyHeatmapResponseSchema = z.object({
  categories: z.array(
    z.object({
      value: z.enum(anomalyCategoryValues),
      label: z.string()
    })
  ),
  days: z.array(
    z.object({
      date: isoDateSchema,
      score: z.number().int(),
      anomalyCount: z.number().int(),
      severityBreakdown: z.object({
        high: z.number().int(),
        medium: z.number().int(),
        low: z.number().int()
      }),
      types: z.array(z.enum(anomalyHeatmapTypeValues)),
      summaries: z.array(z.string())
    })
  ),
  filter: z.object({
    category: z.enum(anomalyCategoryValues),
    categoryLabel: z.string(),
    range: z.enum(anomalyRangeValues)
  }),
  range: z.object({
    endDay: isoDateSchema.nullable(),
    startDay: isoDateSchema.nullable()
  })
});

const ouraConnectionStatusSchema = z.object({
  provider: z.literal("oura"),
  configured: z.boolean(),
  missingConfiguration: z.array(z.string()),
  requestedScopes: z.array(z.string()),
  connected: z.boolean(),
  needsReconnect: z.boolean(),
  connection: z
    .object({
      isActive: z.boolean(),
      connectedAt: isoDateTimeSchema,
      expiresAt: isoDateTimeSchema,
      scopes: z.array(z.string()),
      tokenExpired: z.boolean()
    })
    .nullable()
});

const ouraConnectResponseSchema = z.object({
  provider: z.literal("oura"),
  authorizationUrl: z.string().url()
});

const ouraConnectUnavailableSchema = ouraConnectionStatusSchema.extend({
  message: z.string()
});

const ouraDisconnectResponseSchema = z.object({
  provider: z.literal("oura"),
  disconnected: z.literal(true),
  connected: z.literal(false)
});

const syncRunSummarySchema = z.object({
  sleepRecords: z.number().int(),
  readinessRecords: z.number().int(),
  activityRecords: z.number().int()
});

const syncWindowSchema = z.object({
  startDate: isoDateSchema,
  endDate: isoDateSchema
});

const runSyncResponseSchema = z.object({
  syncRun: syncRunSchema,
  summary: syncRunSummarySchema,
  window: syncWindowSchema
});

const syncStatusResponseSchema = z.object({
  provider: z.literal("oura"),
  running: z.boolean(),
  currentRun: syncRunSchema.nullable(),
  latestRun: syncRunSchema.nullable()
});

const syncHistoryResponseSchema = z.object({
  provider: z.literal("oura"),
  runs: z.array(syncRunSchema)
});

const aiDailyBriefSchema = z.object({
  generated_at: isoDateTimeSchema,
  day: isoDateTimeSchema,
  recovery_score: z.number().int(),
  recovery_confidence: nullableNumberSchema,
  explanation_summary: z.string(),
  sleep_seconds: z.number().int(),
  sleep_human: z.string().nullable(),
  sleep_delta_seconds: nullableNumberSchema,
  hrv: nullableNumberSchema,
  hrv_baseline: nullableNumberSchema,
  resting_heart_rate: nullableNumberSchema,
  resting_heart_rate_baseline: nullableNumberSchema,
  temperature_deviation: nullableNumberSchema,
  temperature_baseline: nullableNumberSchema,
  anomaly_count: z.number().int(),
  anomaly_titles: z.array(z.string()),
  sync_status: z.union([z.enum(syncStatusValues), z.literal("idle")]),
  last_synced_at: nullableDateTimeSchema,
  summary_text: z.string()
});

const aiLastNightSchema = z.object({
  day: isoDateTimeSchema,
  sleep_total_seconds: z.number().int(),
  sleep_total_human: z.string().nullable(),
  time_in_bed_seconds: z.number().int(),
  time_in_bed_human: z.string().nullable(),
  sleep_efficiency: nullableNumberSchema,
  sleep_latency_seconds: z.number().int().nullable(),
  sleep_latency_human: z.string().nullable(),
  bedtime_start: nullableDateTimeSchema,
  bedtime_end: nullableDateTimeSchema,
  average_sleep_hr: nullableNumberSchema,
  lowest_sleep_hr: nullableNumberSchema,
  average_sleep_hrv: nullableNumberSchema,
  sleep_baseline_seconds: nullableNumberSchema,
  sleep_delta_seconds: nullableNumberSchema,
  note: z.string()
});

const aiRecoverySchema = z.object({
  day: isoDateTimeSchema,
  recovery_score: z.number().int(),
  confidence: nullableNumberSchema,
  explanation_summary: z.string(),
  hrv: nullableNumberSchema,
  hrv_baseline: nullableNumberSchema,
  resting_heart_rate: nullableNumberSchema,
  resting_heart_rate_baseline: nullableNumberSchema,
  temperature_deviation: nullableNumberSchema,
  temperature_baseline: nullableNumberSchema,
  sleep_seconds: z.number().int(),
  sleep_baseline_seconds: nullableNumberSchema,
  hrv_contribution: nullableNumberSchema,
  resting_heart_rate_contribution: nullableNumberSchema,
  sleep_contribution: nullableNumberSchema,
  temperature_contribution: nullableNumberSchema,
  factors: z.array(
    z.object({
      key: z.enum(["hrv", "restingHeartRate", "sleepDuration", "temperature"]),
      label: z.string(),
      status: z.enum(["positive", "negative", "neutral"]),
      current_value: nullableNumberSchema,
      baseline_value: nullableNumberSchema,
      contribution: nullableNumberSchema,
      unit: z.string(),
      detail: z.string()
    })
  ),
  anomaly_count: z.number().int(),
  anomaly_titles: z.array(z.string())
});

const aiAnomalySummarySchema = z.object({
  day: isoDateTimeSchema,
  latest_flag_count: z.number().int(),
  recent_flag_count: z.number().int(),
  latest_titles: z.array(z.string()),
  items: z.array(
    z.object({
      day: isoDateTimeSchema,
      type: z.string(),
      severity: z.enum(anomalySeverityValues),
      title: z.string(),
      description: z.string()
    })
  ),
  summary_text: z.string()
});

const aiContextSchema = z.object({
  generated_at: isoDateTimeSchema,
  window: z.enum(trendWindowValues),
  start_day: isoDateSchema,
  end_day: isoDateSchema,
  average_recovery_score: nullableNumberSchema,
  average_sleep_seconds: nullableNumberSchema,
  average_sleep_human: z.string().nullable(),
  average_hrv: nullableNumberSchema,
  days_with_anomalies: z.number().int(),
  series: z.array(
    z.object({
      day: isoDateSchema,
      recovery_score: nullableNumberSchema,
      sleep_seconds: nullableNumberSchema,
      hrv: nullableNumberSchema,
      resting_heart_rate: nullableNumberSchema,
      temperature_deviation: nullableNumberSchema,
      steps: nullableNumberSchema,
      anomaly_count: z.number().int()
    })
  )
});

export const apiSchemas = {
  aiAnomalySummary: aiAnomalySummarySchema,
  aiContext: aiContextSchema,
  aiDailyBrief: aiDailyBriefSchema,
  aiLastNight: aiLastNightSchema,
  aiRecovery: aiRecoverySchema,
  anomalyHeatmap: anomalyHeatmapResponseSchema,
  anomalyHistory: anomalyHistoryResponseSchema,
  anomaliesCollection: z.object({
    items: z.array(storedAnomalySchema)
  }),
  baselineSnapshot: baselineSnapshotSchema,
  health: healthResponseSchema,
  healthDbFailure: healthDbFailureSchema,
  healthDbSuccess: healthDbSuccessSchema,
  ouraConnect: ouraConnectResponseSchema,
  ouraConnectUnavailable: ouraConnectUnavailableSchema,
  ouraConnectionStatus: ouraConnectionStatusSchema,
  ouraDisconnect: ouraDisconnectResponseSchema,
  overview: overviewResponseSchema,
  recoveryDetail: recoveryDetailSchema,
  recoveryScore: recoveryScoreSchema,
  rootStatus: rootStatusSchema,
  runSync: runSyncResponseSchema,
  sleepSummary: sleepSummarySchema,
  syncHistory: syncHistoryResponseSchema,
  syncRun: syncRunSchema,
  syncStatus: syncStatusResponseSchema,
  trendSummary: trendSummarySchema
};
