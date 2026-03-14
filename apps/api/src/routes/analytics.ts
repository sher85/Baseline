import { Router } from "express";

import {
  type AnomalyCategory,
  anomalyCategoryOptions,
  getAnomalyHeatmap,
  getAnomalyHistoryPage,
  getLatestAnomalies,
  getRecentAnomalies
} from "../modules/analytics/anomaly.service.js";
import { getLatestBaselineSnapshot } from "../modules/analytics/baseline.service.js";
import { getLatestRecoveryScore } from "../modules/recovery/recovery-score.service.js";
import { getLatestOverview } from "../modules/summaries/overview.service.js";
import { getLatestRecoveryDetail } from "../modules/summaries/recovery-detail.service.js";
import { getLatestSleepSummary } from "../modules/summaries/sleep.service.js";
import { getTrendSummary } from "../modules/summaries/trends.service.js";

export const analyticsRouter = Router();

function isAnomalyCategory(value: string): value is AnomalyCategory {
  return anomalyCategoryOptions.some((option) => option.value === value);
}

analyticsRouter.get("/overview/latest", async (_request, response) => {
  const overview = await getLatestOverview();

  if (!overview) {
    response.status(404).json({
      error: "No overview data is available yet."
    });

    return;
  }

  response.json(overview);
});

analyticsRouter.get("/baselines/latest", async (_request, response) => {
  const baseline = await getLatestBaselineSnapshot();

  if (!baseline) {
    response.status(404).json({
      error: "No baseline data is available yet."
    });

    return;
  }

  response.json(baseline);
});

analyticsRouter.get("/recovery/latest", async (_request, response) => {
  const recovery = await getLatestRecoveryScore();

  if (!recovery) {
    response.status(404).json({
      error: "No recovery data is available yet."
    });

    return;
  }

  response.json(recovery);
});

analyticsRouter.get("/recovery/latest/detail", async (_request, response) => {
  const recovery = await getLatestRecoveryDetail();

  if (!recovery) {
    response.status(404).json({
      error: "No recovery detail is available yet."
    });

    return;
  }

  response.json(recovery);
});

analyticsRouter.get("/sleep/latest", async (_request, response) => {
  const sleep = await getLatestSleepSummary();

  if (!sleep) {
    response.status(404).json({
      error: "No sleep summary is available yet."
    });

    return;
  }

  response.json(sleep);
});

analyticsRouter.get("/trends", async (request, response) => {
  const requestedWindow = request.query.window;
  const window = requestedWindow === "30d" ? "30d" : requestedWindow === "7d" ? "7d" : null;

  if (!window) {
    response.status(400).json({
      error: "Query parameter 'window' must be either '7d' or '30d'."
    });

    return;
  }

  const trends = await getTrendSummary(window);

  if (!trends) {
    response.status(404).json({
      error: "No trend data is available yet."
    });

    return;
  }

  response.json(trends);
});

analyticsRouter.get("/anomalies/latest", async (_request, response) => {
  const anomalies = await getLatestAnomalies();

  response.json({
    items: anomalies
  });
});

analyticsRouter.get("/anomalies/recent", async (request, response) => {
  const requestedLimit = Number(request.query.limit ?? 20);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 60)
    : 20;
  const anomalies = await getRecentAnomalies(limit);

  response.json({
    items: anomalies
  });
});

analyticsRouter.get("/anomalies/history", async (request, response) => {
  const requestedLimitDays = Number(request.query.limitDays ?? 10);
  const limitDays = Number.isFinite(requestedLimitDays)
    ? Math.min(Math.max(Math.trunc(requestedLimitDays), 1), 366)
    : 10;
  const cursorDay =
    typeof request.query.cursorDay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(request.query.cursorDay)
      ? request.query.cursorDay
      : undefined;
  const targetDay =
    typeof request.query.targetDay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(request.query.targetDay)
      ? request.query.targetDay
      : undefined;

  const history = await getAnomalyHistoryPage(limitDays, cursorDay, targetDay);

  response.json(history);
});

analyticsRouter.get("/anomalies/heatmap", async (request, response) => {
  const requestedRange = request.query.range;
  const range =
    requestedRange === "3m" || requestedRange === "6m" || requestedRange === "12m"
      ? requestedRange
      : null;
  const requestedCategory = request.query.type;
  const category =
    typeof requestedCategory === "string" && isAnomalyCategory(requestedCategory)
      ? requestedCategory
      : null;

  if (!range) {
    response.status(400).json({
      error: "Query parameter 'range' must be one of '3m', '6m', or '12m'."
    });

    return;
  }

  if (!category) {
    response.status(400).json({
      error: "Query parameter 'type' must be a supported anomaly category."
    });

    return;
  }

  const heatmap = await getAnomalyHeatmap(range, category);

  response.json(heatmap);
});
