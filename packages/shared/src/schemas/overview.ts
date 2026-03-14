import { z } from "zod";

export const overviewMetricSchema = z.object({
  label: z.string(),
  value: z.string(),
  detail: z.string(),
  direction: z.enum(["up", "down", "flat"]).optional()
});

export const overviewResponseSchema = z.object({
  generatedAt: z.string(),
  metrics: z.array(overviewMetricSchema)
});
