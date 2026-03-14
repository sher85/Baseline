import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  API_PORT: z.coerce.number().default(4000),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default("http://localhost:4000"),
  SYNC_SCHEDULE_CRON: z.string().default("0 6 * * *")
});

export const env = envSchema.parse(process.env);
