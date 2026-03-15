import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadDotenv } from "dotenv";

import { z } from "zod";

const envDir = dirname(fileURLToPath(import.meta.url));
const candidateEnvPaths = [
  resolve(process.cwd(), ".env"),
  resolve(envDir, "../../../../.env")
];

for (const envPath of candidateEnvPaths) {
  if (existsSync(envPath)) {
    loadDotenv({ path: envPath });
    break;
  }
}

const optionalNonEmptyString = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().min(1).optional()
);

const rawEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  API_PORT: z.coerce.number().default(4000),
  WEB_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default("http://localhost:4000"),
  OURA_CLIENT_ID: optionalNonEmptyString,
  OURA_CLIENT_SECRET: optionalNonEmptyString,
  OURA_REDIRECT_URI: z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmed = value.trim();

      return trimmed.length > 0 ? trimmed : undefined;
    },
    z.string().url().optional()
  ),
  OURA_SCOPES: z.string().default("daily email personal"),
  SYNC_SCHEDULE_CRON: z.string().default("0 6 * * *"),
  SYNC_SCHEDULE_ENABLED: z.coerce.boolean().default(true),
  SYNC_SCHEDULE_RUN_ON_START: z.coerce.boolean().default(false)
});

const parsedEnv = rawEnvSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  OURA_REDIRECT_URI:
    parsedEnv.OURA_REDIRECT_URI ??
    `${parsedEnv.NEXT_PUBLIC_API_BASE_URL}/api/integrations/oura/callback`
};
