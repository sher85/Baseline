import cors from "cors";
import express from "express";

import { aiRouter } from "./routes/ai.js";
import { analyticsRouter } from "./routes/analytics.js";
import { healthRouter } from "./routes/health.js";
import { ouraIntegrationRouter } from "./routes/oura-integration.js";
import { syncRouter } from "./routes/sync.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_request, response) => {
  response.json({
    name: "wearable-analytics-api",
    status: "booting",
    docs: "/health"
  });
});

app.use("/health", healthRouter);
app.use("/api/integrations/oura", ouraIntegrationRouter);
app.use("/api/sync", syncRouter);
app.use("/api/ai", aiRouter);
app.use("/api", analyticsRouter);
