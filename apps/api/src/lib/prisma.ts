import { PrismaClient } from "@prisma/client";

declare global {
  var __wearableAnalyticsPrisma__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__wearableAnalyticsPrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__wearableAnalyticsPrisma__ = prisma;
}
