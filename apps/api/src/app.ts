import cors from "cors";
import express from "express";
import type { ErrorRequestHandler } from "express";

import { aiRouter } from "./routes/ai.js";
import { analyticsRouter } from "./routes/analytics.js";
import { appleHealthRouter } from "./routes/apple-health.js";
import { healthRouter } from "./routes/health.js";
import { openapiRouter } from "./routes/openapi.js";
import { ouraIntegrationRouter } from "./routes/oura-integration.js";
import { syncRouter } from "./routes/sync.js";

export const app = express();

app.use(cors());
app.use("/api/integrations/apple-health", express.json({ limit: "25mb" }), appleHealthRouter);
app.use(express.json({ limit: "1mb" }));

app.get("/ping", (_request, response) => {
  response.type("text/plain").send("pong");
});

app.get("/", (_request, response) => {
  response.json({
    name: "wearable-analytics-api",
    status: "booting",
    docs: "/docs"
  });
});

app.use(openapiRouter);
app.use("/health", healthRouter);
app.use("/api/integrations/oura", ouraIntegrationRouter);
app.use("/api/sync", syncRouter);
app.use("/api/ai", aiRouter);
app.use("/api", analyticsRouter);

const jsonErrorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  if (error && typeof error === "object" && "type" in error && error.type === "entity.too.large") {
    response.status(413).json({
      error: "Payload too large",
      message: "The sync batch is too large for the API to accept."
    });

    return;
  }

  next(error);
};

app.use(jsonErrorHandler);
