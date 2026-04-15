import { Router } from "express";

import { trendWindowQuerySchema } from "../contracts/api-contract.js";
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
  const parsedQuery = trendWindowQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({
      error: "Query parameter 'window' must be either '7d' or '30d'."
    });

    return;
  }

  const summary = await getAiContext(parsedQuery.data.window);

  if (!summary) {
    response.status(404).json({
      error: "No AI context summary is available yet."
    });

    return;
  }

  response.json(summary);
});
