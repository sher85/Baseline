import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { env } from "../config/env.js";
import { PrismaClient } from "./prisma-client.js";

declare global {
  var __wearableAnalyticsPgPool__: Pool | undefined;
  var __wearableAnalyticsPrisma__: PrismaClient | undefined;
}

const pool =
  globalThis.__wearableAnalyticsPgPool__ ??
  new Pool({
    connectionString: env.DATABASE_URL
  });

export const prisma =
  globalThis.__wearableAnalyticsPrisma__ ??
  new PrismaClient({
    adapter: new PrismaPg(pool),
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__wearableAnalyticsPgPool__ = pool;
  globalThis.__wearableAnalyticsPrisma__ = prisma;
}
