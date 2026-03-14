import { Router } from "express";

import {
  getAiAnomalySummary,
  getAiContext,
  getAiDailyBrief,
  getAiLastNightSummary,
  getAiRecoverySummary
} from "../modules/summaries/ai.service.js";

export const aiRouter = Router();

aiRouter.get("/daily-brief", async (_request, response) => {
  const brief = await getAiDailyBrief();

  if (!brief) {
    response.status(404).json({
      error: "No AI daily brief is available yet."
    });

    return;
  }

  response.json(brief);
});

aiRouter.get("/last-night", async (_request, response) => {
  const summary = await getAiLastNightSummary();

  if (!summary) {
    response.status(404).json({
      error: "No AI last-night summary is available yet."
    });

    return;
  }

  response.json(summary);
});

aiRouter.get("/recovery", async (_request, response) => {
  const summary = await getAiRecoverySummary();

  if (!summary) {
    response.status(404).json({
      error: "No AI recovery summary is available yet."
    });

    return;
  }

  response.json(summary);
});

aiRouter.get("/anomalies", async (_request, response) => {
  const summary = await getAiAnomalySummary();

  if (!summary) {
    response.status(404).json({
      error: "No AI anomaly summary is available yet."
    });

    return;
  }

  response.json(summary);
});

aiRouter.get("/context", async (request, response) => {
  const requestedWindow = request.query.window;
  const window = requestedWindow === "30d" ? "30d" : requestedWindow === "7d" ? "7d" : null;

  if (!window) {
    response.status(400).json({
      error: "Query parameter 'window' must be either '7d' or '30d'."
    });

    return;
  }

  const summary = await getAiContext(window);

  if (!summary) {
    response.status(404).json({
      error: "No AI context summary is available yet."
    });

    return;
  }

  response.json(summary);
});
