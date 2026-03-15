import type { User } from "../../lib/prisma-client.js";

import { prisma } from "../../lib/prisma.js";

const PRIMARY_USER_EMAIL = "local-user@wearable-analytics.local";
const PRIMARY_EXTERNAL_ID = "local-primary-user";

export async function getOrCreatePrimaryUser(): Promise<User> {
  const existingPrimaryUser = await prisma.user.findUnique({
    where: {
      externalIdentifier: PRIMARY_EXTERNAL_ID
    }
  });

  if (existingPrimaryUser) {
    return existingPrimaryUser;
  }

  const primaryUser = await prisma.user.create({
    data: {
      email: PRIMARY_USER_EMAIL,
      externalIdentifier: PRIMARY_EXTERNAL_ID
    }
  });

  const existingConnectedUser = await prisma.user.findFirst({
    where: {
      ouraConnection: {
        is: {
          isActive: true
        }
      }
    },
    include: {
      ouraConnection: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  if (existingConnectedUser?.ouraConnection) {
    await prisma.ouraConnection.update({
      where: {
        userId: existingConnectedUser.id
      },
      data: {
        userId: primaryUser.id
      }
    });
  }

  return primaryUser;
}
