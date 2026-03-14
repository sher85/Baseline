import type { User } from "@prisma/client";

import { prisma } from "../../lib/prisma.js";

const FALLBACK_EMAIL = "local-user@wearable-analytics.local";
const FALLBACK_EXTERNAL_ID = "local-single-user";

export async function getOrCreatePrimaryUser(): Promise<User> {
  const existingUser = await prisma.user.findFirst({
    orderBy: {
      createdAt: "asc"
    }
  });

  if (existingUser) {
    return existingUser;
  }

  return prisma.user.create({
    data: {
      email: FALLBACK_EMAIL,
      externalIdentifier: FALLBACK_EXTERNAL_ID
    }
  });
}
