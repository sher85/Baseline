import { Router } from "express";

import { getLatestAnomalies } from "../modules/analytics/anomaly.service.js";
import { getLatestBaselineSnapshot } from "../modules/analytics/baseline.service.js";
import { getLatestRecoveryScore } from "../modules/recovery/recovery-score.service.js";

export const analyticsRouter = Router();

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

analyticsRouter.get("/anomalies/latest", async (_request, response) => {
  const anomalies = await getLatestAnomalies();

  response.json({
    items: anomalies
  });
});
