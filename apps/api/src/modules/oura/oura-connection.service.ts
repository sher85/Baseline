import type { OuraConnection } from "@prisma/client";

import { prisma } from "../../lib/prisma.js";
import { getOrCreatePrimaryUser } from "../auth/single-user.service.js";
import {
  getMissingOuraConfiguration,
  getRequestedOuraScopes,
  isOuraConfigured,
  refreshOuraTokens,
  type OuraTokenResponse
} from "./oura-oauth.service.js";
import {
  OuraAuthenticationError,
  isLikelyOuraAuthenticationFailure
} from "./oura-errors.js";

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

function parseScopes(scope?: string | null) {
  return scope ? scope.split(/\s+/).filter(Boolean) : [];
}

function toExpirationDate(expiresInSeconds: number) {
  return new Date(Date.now() + expiresInSeconds * 1000);
}

function mapConnection(connection: OuraConnection | null) {
  if (!connection) {
    return {
      connected: false,
      needsReconnect: false,
      connection: null
    } as const;
  }

  return {
    connected: connection.isActive,
    needsReconnect: !connection.isActive,
    connection: {
      isActive: connection.isActive,
      connectedAt: connection.createdAt.toISOString(),
      expiresAt: connection.tokenExpiresAt.toISOString(),
      scopes: parseScopes(connection.scope),
      tokenExpired: connection.tokenExpiresAt.getTime() <= Date.now()
    }
  } as const;
}

export async function getOuraConnectionStatus() {
  const user = await getOrCreatePrimaryUser();
  const connection = await prisma.ouraConnection.findUnique({
    where: {
      userId: user.id
    }
  });

  return {
    provider: "oura" as const,
    configured: isOuraConfigured(),
    missingConfiguration: getMissingOuraConfiguration(),
    requestedScopes: getRequestedOuraScopes(),
    ...mapConnection(connection)
  };
}

export async function storeOuraConnection(tokenResponse: OuraTokenResponse, grantedScope?: string) {
  const user = await getOrCreatePrimaryUser();

  return prisma.ouraConnection.upsert({
    where: {
      userId: user.id
    },
    update: {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      scope: grantedScope ?? tokenResponse.scope ?? null,
      tokenExpiresAt: toExpirationDate(tokenResponse.expires_in),
      isActive: true
    },
    create: {
      userId: user.id,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      scope: grantedScope ?? tokenResponse.scope ?? null,
      tokenExpiresAt: toExpirationDate(tokenResponse.expires_in),
      isActive: true
    }
  });
}

export async function disconnectOuraConnection() {
  const user = await getOrCreatePrimaryUser();

  await prisma.ouraConnection.deleteMany({
    where: {
      userId: user.id
    }
  });

  return {
    provider: "oura" as const,
    disconnected: true
  };
}

export async function deactivateOuraConnection() {
  const user = await getOrCreatePrimaryUser();

  return prisma.ouraConnection.updateMany({
    where: {
      userId: user.id
    },
    data: {
      isActive: false
    }
  });
}

export async function getValidOuraConnection() {
  const user = await getOrCreatePrimaryUser();
  const connection = await prisma.ouraConnection.findUnique({
    where: {
      userId: user.id
    }
  });

  if (!connection) {
    return null;
  }

  const shouldRefresh =
    connection.tokenExpiresAt.getTime() <= Date.now() + TOKEN_REFRESH_BUFFER_MS;

  if (!shouldRefresh) {
    return connection;
  }

  try {
    const refreshedTokens = await refreshOuraTokens(connection.refreshToken);

    return storeOuraConnection(
      refreshedTokens,
      refreshedTokens.scope ?? connection.scope ?? undefined
    );
  } catch (error) {
    if (isLikelyOuraAuthenticationFailure(error)) {
      await deactivateOuraConnection();
      throw new OuraAuthenticationError(
        "Stored Oura authorization is no longer valid. Reconnect Oura and try again."
      );
    }

    throw error;
  }
}
