import { Router } from "express";

import { prisma } from "../lib/prisma.js";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  response.json({
    ok: true,
    service: "wearable-analytics-api",
    timestamp: new Date().toISOString()
  });
});

healthRouter.get("/db", async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    response.json({
      ok: true,
      database: "reachable"
    });
  } catch (error) {
    response.status(503).json({
      ok: false,
      database: "unreachable",
      error: error instanceof Error ? error.message : "Unknown database error"
    });
  }
});
