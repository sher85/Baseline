import { Router } from "express";

import { appleHealthIngestBodySchema } from "../contracts/api-contract.js";
import {
  isApiTokenConfigured,
  requireApiToken
} from "../modules/auth/api-token-auth.js";
import {
  AppleHealthIngestError,
  getAppleHealthStatus,
  ingestAppleHealthBatch
} from "../modules/apple-health/apple-health-ingestion.service.js";

export const appleHealthRouter = Router();

appleHealthRouter.get("/status", requireApiToken, async (_request, response) => {
  const status = await getAppleHealthStatus();

  response.json({
    ...status,
    configured: isApiTokenConfigured()
  });
});

appleHealthRouter.post("/ingest", requireApiToken, async (request, response) => {
  const parsedBody = appleHealthIngestBodySchema.safeParse(request.body ?? {});

  if (!parsedBody.success) {
    const payload = {
      error: "Invalid Apple Health ingest payload",
      issues: parsedBody.error.flatten()
    };

    response.status(400).json(payload);

    return;
  }

  try {
    const result = await ingestAppleHealthBatch(parsedBody.data);

    response.status(201).json(result);
  } catch (error) {
    if (error instanceof AppleHealthIngestError) {
      response.status(500).json({
        error: "Apple Health ingest failed",
        batchId: error.batchId,
        message: error.message
      });

      return;
    }

    response.status(500).json({
      error: error instanceof Error ? error.message : "Unknown Apple Health ingest error"
    });
  }
});
