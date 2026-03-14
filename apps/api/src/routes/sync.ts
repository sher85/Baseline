import { Router } from "express";
import { z } from "zod";

import { isOuraAuthenticationError } from "../modules/oura/oura-errors.js";
import {
  getOuraSyncHistory,
  getOuraSyncStatus,
  runManualOuraSync
} from "../modules/sync/oura-sync.service.js";

const manualSyncBodySchema = z
  .object({
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
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

export const syncRouter = Router();

syncRouter.post("/oura/run", async (request, response) => {
  const parsedBody = manualSyncBodySchema.safeParse(request.body ?? {});

  if (!parsedBody.success) {
    response.status(400).json({
      error: "Invalid sync request payload",
      issues: parsedBody.error.flatten()
    });

    return;
  }

  try {
    const result = await runManualOuraSync({
      ...(parsedBody.data.startDate ? { startDate: parsedBody.data.startDate } : {}),
      ...(parsedBody.data.endDate ? { endDate: parsedBody.data.endDate } : {}),
      ...(typeof parsedBody.data.lookbackDays === "number"
        ? { lookbackDays: parsedBody.data.lookbackDays }
        : {})
    });

    response.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    const statusCode = isOuraAuthenticationError(error)
      ? 401
      : message.includes("already running")
        ? 409
        : 500;

    response.status(statusCode).json({
      error: message,
      ...(statusCode === 401 ? { reauthenticationRequired: true } : {})
    });
  }
});

syncRouter.get("/status", async (_request, response) => {
  const status = await getOuraSyncStatus();

  response.json(status);
});

syncRouter.get("/history", async (_request, response) => {
  const history = await getOuraSyncHistory();

  response.json(history);
});
