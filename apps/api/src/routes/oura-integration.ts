import { Router } from "express";
import { z } from "zod";

import { env } from "../config/env.js";
import { parseCookieHeader, serializeCookie } from "../lib/cookies.js";
import {
  disconnectOuraConnection,
  getOuraConnectionStatus,
  storeOuraConnection
} from "../modules/oura/oura-connection.service.js";
import {
  buildOuraAuthorizationUrl,
  buildPostConnectRedirect,
  createOAuthState,
  exchangeCodeForOuraTokens,
  isOuraConfigured
} from "../modules/oura/oura-oauth.service.js";

const callbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  error: z.string().min(1).optional(),
  scope: z.string().optional(),
  state: z.string().min(1).optional()
});

const OAUTH_STATE_COOKIE = "oura_oauth_state";

export const ouraIntegrationRouter = Router();

function createStateCookie(value: string) {
  return serializeCookie(OAUTH_STATE_COOKIE, value, {
    httpOnly: true,
    maxAgeSeconds: 10 * 60,
    path: "/",
    sameSite: "Lax",
    secure: env.WEB_APP_URL.startsWith("https://")
  });
}

function clearStateCookie() {
  return serializeCookie(OAUTH_STATE_COOKIE, "", {
    expires: new Date(0),
    httpOnly: true,
    path: "/",
    sameSite: "Lax",
    secure: env.WEB_APP_URL.startsWith("https://")
  });
}

ouraIntegrationRouter.get("/status", async (_request, response) => {
  const status = await getOuraConnectionStatus();

  response.json(status);
});

ouraIntegrationRouter.post("/connect", async (_request, response) => {
  if (!isOuraConfigured()) {
    const status = await getOuraConnectionStatus();

    response.status(503).json({
      ...status,
      message: "Oura OAuth is not configured in the local environment."
    });

    return;
  }

  const state = createOAuthState();
  const authorizationUrl = buildOuraAuthorizationUrl(state);

  response.setHeader("Set-Cookie", createStateCookie(state));
  response.status(201).json({
    provider: "oura",
    authorizationUrl
  });
});

ouraIntegrationRouter.get("/callback", async (request, response) => {
  const parsedQuery = callbackQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.redirect(buildPostConnectRedirect({ oura: "invalid_callback" }));

    return;
  }

  const cookies = parseCookieHeader(request.headers.cookie);
  const expectedState = cookies[OAUTH_STATE_COOKIE];
  const { code, error, scope, state } = parsedQuery.data;

  if (error) {
    response.setHeader("Set-Cookie", clearStateCookie());
    response.redirect(buildPostConnectRedirect({ oura: "access_denied" }));

    return;
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    response.setHeader("Set-Cookie", clearStateCookie());
    response.redirect(buildPostConnectRedirect({ oura: "invalid_state" }));

    return;
  }

  try {
    const tokenResponse = await exchangeCodeForOuraTokens(code);

    await storeOuraConnection(tokenResponse, scope);

    response.setHeader("Set-Cookie", clearStateCookie());
    response.redirect(buildPostConnectRedirect({ oura: "connected" }));
  } catch (error) {
    response.setHeader("Set-Cookie", clearStateCookie());
    response.redirect(
      buildPostConnectRedirect({
        oura: "token_exchange_failed",
        reason: error instanceof Error ? error.message : "unknown_error"
      })
    );
  }
});

ouraIntegrationRouter.post("/disconnect", async (_request, response) => {
  const result = await disconnectOuraConnection();

  response.setHeader("Set-Cookie", clearStateCookie());
  response.json({
    ...result,
    connected: false
  });
});
