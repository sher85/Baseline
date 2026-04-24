import {
  OpenAPIRegistry,
  OpenApiGeneratorV3
} from "@asteasolutions/zod-to-openapi";
import { z } from "../lib/zod-openapi.js";

import {
  anomaliesHistoryQuerySchema,
  anomaliesRecentQuerySchema,
  anomalyHeatmapQuerySchema,
  apiSchemas,
  backfillSyncBodySchema,
  callbackQuerySchema,
  errorResponseSchema,
  manualSyncBodySchema,
  syncErrorResponseSchema,
  trendWindowQuerySchema,
  validationErrorResponseSchema
} from "../contracts/api-contract.js";

const registry = new OpenAPIRegistry();

const rootStatusSchema = registry.register("RootStatus", apiSchemas.rootStatus);
const healthSchema = registry.register("HealthResponse", apiSchemas.health);
const healthDbSuccessSchema = registry.register("HealthDbSuccess", apiSchemas.healthDbSuccess);
const healthDbFailureSchema = registry.register("HealthDbFailure", apiSchemas.healthDbFailure);
const errorSchema = registry.register("ErrorResponse", errorResponseSchema);
const validationErrorSchema = registry.register(
  "ValidationErrorResponse",
  validationErrorResponseSchema
);
const syncErrorSchema = registry.register("SyncErrorResponse", syncErrorResponseSchema);
const overviewSchema = registry.register("OverviewResponse", apiSchemas.overview);
const baselineSnapshotSchema = registry.register(
  "BaselineSnapshotResponse",
  apiSchemas.baselineSnapshot
);
const recoveryScoreSchema = registry.register("RecoveryScoreResponse", apiSchemas.recoveryScore);
const recoveryDetailSchema = registry.register("RecoveryDetailResponse", apiSchemas.recoveryDetail);
const sleepSummarySchema = registry.register("SleepSummaryResponse", apiSchemas.sleepSummary);
const trendSummarySchema = registry.register("TrendSummaryResponse", apiSchemas.trendSummary);
const anomaliesCollectionSchema = registry.register(
  "AnomaliesCollectionResponse",
  apiSchemas.anomaliesCollection
);
const anomalyHistorySchema = registry.register(
  "AnomalyHistoryResponse",
  apiSchemas.anomalyHistory
);
const anomalyHeatmapSchema = registry.register(
  "AnomalyHeatmapResponse",
  apiSchemas.anomalyHeatmap
);
const aiDailyBriefSchema = registry.register("AiDailyBriefResponse", apiSchemas.aiDailyBrief);
const aiLastNightSchema = registry.register("AiLastNightResponse", apiSchemas.aiLastNight);
const aiRecoverySchema = registry.register("AiRecoveryResponse", apiSchemas.aiRecovery);
const aiAnomalySummarySchema = registry.register(
  "AiAnomalySummaryResponse",
  apiSchemas.aiAnomalySummary
);
const aiContextSchema = registry.register("AiContextResponse", apiSchemas.aiContext);
const ouraConnectionStatusSchema = registry.register(
  "OuraConnectionStatusResponse",
  apiSchemas.ouraConnectionStatus
);
const ouraConnectSchema = registry.register("OuraConnectResponse", apiSchemas.ouraConnect);
const ouraConnectUnavailableSchema = registry.register(
  "OuraConnectUnavailableResponse",
  apiSchemas.ouraConnectUnavailable
);
const ouraDisconnectSchema = registry.register(
  "OuraDisconnectResponse",
  apiSchemas.ouraDisconnect
);
const runSyncSchema = registry.register("RunSyncResponse", apiSchemas.runSync);
const syncStatusSchema = registry.register("SyncStatusResponse", apiSchemas.syncStatus);
const syncHistorySchema = registry.register("SyncHistoryResponse", apiSchemas.syncHistory);

function jsonContent(schema: z.ZodTypeAny) {
  return {
    "application/json": {
      schema
    }
  };
}

registry.registerPath({
  method: "get",
  path: "/ping",
  tags: ["General"],
  operationId: "ping",
  summary: "Lightweight liveness response",
  responses: {
    200: {
      description: "Plain-text ping response.",
      content: {
        "text/plain": {
          schema: {
            type: "string",
            example: "pong"
          }
        }
      }
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/",
  tags: ["General"],
  operationId: "getApiRoot",
  summary: "Get service status",
  responses: {
    200: {
      description: "Basic API status response.",
      content: jsonContent(rootStatusSchema)
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/health",
  tags: ["Health"],
  operationId: "getHealth",
  summary: "Get application health",
  responses: {
    200: {
      description: "Application health information.",
      content: jsonContent(healthSchema)
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/health/db",
  tags: ["Health"],
  operationId: "getDatabaseHealth",
  summary: "Check database connectivity",
  responses: {
    200: {
      description: "Database is reachable.",
      content: jsonContent(healthDbSuccessSchema)
    },
    503: {
      description: "Database is unreachable.",
      content: jsonContent(healthDbFailureSchema)
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/overview/latest",
  tags: ["Analytics"],
  operationId: "getLatestOverview",
  summary: "Get the latest overview summary",
  responses: {
    200: {
      description: "Latest overview payload.",
      content: jsonContent(overviewSchema)
    },
    404: {
      description: "No overview data is available yet.",
      content: jsonContent(errorSchema)
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/baselines/latest",
  tags: ["Analytics"],
  operationId: "getLatestBaseline",
  summary: "Get the latest baseline snapshot",
  responses: {
    200: {
      description: "Latest baseline snapshot.",
      content: jsonContent(baselineSnapshotSchema)
    },
    404: {
      description: "No baseline data is available yet.",
      content: jsonContent(errorSchema)
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/recovery/latest",
  tags: ["Analytics"],
  operationId: "getLatestRecoveryScore",
  summary: "Get the latest recovery score",
  responses: {
    200: {
      description: "Latest recovery score.",
      content: jsonContent(recoveryScoreSchema)
    },
    404: {
      description: "No recovery data is available yet.",
      content: jsonContent(errorSchema)
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/recovery/latest/detail",
  tags: ["Analytics"],
  operationId: "getLatestRecoveryDetail",
  summary: "Get the latest detailed recovery summary",
  responses: {
    200: {
      description: "Latest detailed recovery payload.",
      content: jsonContent(recoveryDetailSchema)
    },
    404: {
      description: "No recovery detail is available yet.",
      content: jsonContent(errorSchema)
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/sleep/latest",
  tags: ["Analytics"],
  operationId: "getLatestSleepSummary",
  summary: "Get the latest sleep summary",
  responses: {
    200: {
      description: "Latest sleep summary.",
      content: jsonContent(sleepSummarySchema)
    },
    404: {
      description: "No sleep summary is available yet.",
      content: jsonContent(errorSchema)
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/trends",
  tags: ["Analytics"],
  operationId: "getTrendSummary",
  summary: "Get the latest trend summary",
  request: {
    query: trendWindowQuerySchema
  },
  responses: {
    200: {
      description: "Trend summary for the requested window.",
      content: jsonContent(trendSummarySchema)
    },
    400: {
      description: "The window query parameter is invalid.",
      content: jsonContent(errorSchema)
    },
    404: {
      description: "No trend data is available yet.",
      content: jsonContent(errorSchema)
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/anomalies/latest",
  tags: ["Analytics"],
  operationId: "getLatestAnomalies",
  summary: "Get anomalies for the latest day",
  responses: {
    200: {
      description: "Latest anomaly flags.",
      content: jsonContent(anomaliesCollectionSchema)
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/anomalies/recent",
  tags: ["Analytics"],
  operationId: "getRecentAnomalies",
  summary: "Get recent anomaly flags",
  request: {
    query: anomaliesRecentQuerySchema
  },
  responses: {
    200: {
      description: "Recent anomaly flags.",
      content: jsonContent(anomaliesCollectionSchema)
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/anomalies/history",
  tags: ["Analytics"],
  operationId: "getAnomalyHistory",
  summary: "Get anomaly history grouped by day",
  request: {
    query: anomaliesHistoryQuerySchema
  },
  responses: {
    200: {
      description: "Paginated anomaly history.",
      content: jsonContent(anomalyHistorySchema)
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/anomalies/heatmap",
  tags: ["Analytics"],
  operationId: "getAnomalyHeatmap",
  summary: "Get anomaly heatmap data",
  request: {
    query: anomalyHeatmapQuerySchema
  },
  responses: {
    200: {
      description: "Anomaly heatmap data.",
      content: jsonContent(anomalyHeatmapSchema)
    },
    400: {
      description: "The range or type query parameter is invalid.",
      content: jsonContent(errorSchema)
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/ai/daily-brief",
  tags: ["AI"],
  operationId: "getAiDailyBrief",
  summary: "Get the latest AI daily brief",
  responses: {
    200: {
      description: "AI daily brief payload.",
      content: jsonContent(aiDailyBriefSchema)
    },
    404: {
      description: "No AI daily brief is available yet.",
      content: jsonContent(errorSchema)
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/ai/last-night",
  tags: ["AI"],
  operationId: "getAiLastNightSummary",
  summary: "Get the latest AI sleep summary",
  responses: {
    200: {
      description: "AI-oriented last-night summary.",
      content: jsonContent(aiLastNightSchema)
    },
    404: {
      description: "No AI last-night summary is available yet.",
      content: jsonContent(errorSchema)
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/ai/recovery",
  tags: ["AI"],
  operationId: "getAiRecoverySummary",
  summary: "Get the latest AI recovery summary",
  responses: {
    200: {
      description: "AI-oriented recovery summary.",
      content: jsonContent(aiRecoverySchema)
    },
    404: {
      description: "No AI recovery summary is available yet.",
      content: jsonContent(errorSchema)
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/ai/anomalies",
  tags: ["AI"],
  operationId: "getAiAnomalySummary",
  summary: "Get the latest AI anomaly summary",
  responses: {
    200: {
      description: "AI-oriented anomaly summary.",
      content: jsonContent(aiAnomalySummarySchema)
    },
    404: {
      description: "No AI anomaly summary is available yet.",
      content: jsonContent(errorSchema)
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/ai/context",
  tags: ["AI"],
  operationId: "getAiContext",
  summary: "Get AI context for a trend window",
  request: {
    query: trendWindowQuerySchema
  },
  responses: {
    200: {
      description: "AI-oriented context summary.",
      content: jsonContent(aiContextSchema)
    },
    400: {
      description: "The window query parameter is invalid.",
      content: jsonContent(errorSchema)
    },
    404: {
      description: "No AI context summary is available yet.",
      content: jsonContent(errorSchema)
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/integrations/oura/status",
  tags: ["Oura Integration"],
  operationId: "getOuraConnectionStatus",
  summary: "Get Oura connection status",
  responses: {
    200: {
      description: "Current Oura connection state.",
      content: jsonContent(ouraConnectionStatusSchema)
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/integrations/oura/connect",
  tags: ["Oura Integration"],
  operationId: "createOuraConnectUrl",
  summary: "Create a new Oura authorization URL",
  responses: {
    201: {
      description: "Created a fresh Oura authorization URL.",
      content: jsonContent(ouraConnectSchema)
    },
    429: {
      description: "Too many connect attempts.",
      content: jsonContent(errorSchema)
    },
    503: {
      description: "Oura OAuth is not configured.",
      content: jsonContent(ouraConnectUnavailableSchema)
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/integrations/oura/callback",
  tags: ["Oura Integration"],
  operationId: "handleOuraCallback",
  summary: "Handle the Oura OAuth callback",
  request: {
    query: callbackQuerySchema
  },
  responses: {
    302: {
      description: "Redirects back to the web app after the callback is handled.",
      headers: {
        Location: {
          description: "Redirect target.",
          schema: {
            type: "string",
            format: "uri"
          }
        }
      }
    },
    429: {
      description: "Too many callback attempts.",
      content: jsonContent(errorSchema)
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/integrations/oura/disconnect",
  tags: ["Oura Integration"],
  operationId: "disconnectOura",
  summary: "Disconnect the local Oura connection",
  responses: {
    200: {
      description: "Disconnected the local Oura connection.",
      content: jsonContent(ouraDisconnectSchema)
    },
    429: {
      description: "Too many disconnect attempts.",
      content: jsonContent(errorSchema)
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/sync/oura/run",
  tags: ["Sync"],
  operationId: "runOuraSync",
  summary: "Run a manual Oura sync",
  request: {
    body: {
      required: false,
      content: jsonContent(manualSyncBodySchema)
    }
  },
  responses: {
    201: {
      description: "Started and completed a manual Oura sync.",
      content: jsonContent(runSyncSchema)
    },
    400: {
      description: "The sync request payload is invalid.",
      content: jsonContent(validationErrorSchema)
    },
    401: {
      description: "Oura reauthentication is required.",
      content: jsonContent(syncErrorSchema)
    },
    409: {
      description: "An Oura sync is already running.",
      content: jsonContent(syncErrorSchema)
    },
    500: {
      description: "The sync failed.",
      content: jsonContent(syncErrorSchema)
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/sync/oura/backfill",
  tags: ["Sync"],
  operationId: "runOuraBackfill",
  summary: "Run an Oura backfill sync",
  request: {
    body: {
      required: true,
      content: jsonContent(backfillSyncBodySchema)
    }
  },
  responses: {
    201: {
      description: "Started and completed an Oura backfill sync.",
      content: jsonContent(runSyncSchema)
    },
    400: {
      description: "The backfill request payload is invalid.",
      content: jsonContent(validationErrorSchema)
    },
    401: {
      description: "Oura reauthentication is required.",
      content: jsonContent(syncErrorSchema)
    },
    409: {
      description: "An Oura sync is already running.",
      content: jsonContent(syncErrorSchema)
    },
    500: {
      description: "The sync failed.",
      content: jsonContent(syncErrorSchema)
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/sync/status",
  tags: ["Sync"],
  operationId: "getOuraSyncStatus",
  summary: "Get the current Oura sync status",
  responses: {
    200: {
      description: "Current Oura sync status.",
      content: jsonContent(syncStatusSchema)
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/sync/history",
  tags: ["Sync"],
  operationId: "getOuraSyncHistory",
  summary: "Get recent Oura sync history",
  responses: {
    200: {
      description: "Recent Oura sync runs.",
      content: jsonContent(syncHistorySchema)
    }
  }
});

export function createOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "wearable-analytics-api",
      version: "0.1.0",
      description: "OpenAPI specification for the wearable analytics API service.",
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT"
      }
    },
    servers: [
      {
        url: "http://localhost:4000",
        description: "Local development server"
      }
    ],
    security: []
  });
}
