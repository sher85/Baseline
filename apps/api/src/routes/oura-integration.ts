import { Router } from "express";
import { z } from "zod";

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
import {
  consumeOuraOAuthState,
  registerOuraOAuthState
} from "../modules/oura/oura-oauth-state.service.js";

const callbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  error: z.string().min(1).optional(),
  scope: z.string().optional(),
  state: z.string().min(1).optional()
});

export const ouraIntegrationRouter = Router();

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
  registerOuraOAuthState(state);

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

  const { code, error, scope, state } = parsedQuery.data;

  if (error) {
    response.redirect(buildPostConnectRedirect({ oura: "access_denied" }));

    return;
  }

  if (!code || !state || !consumeOuraOAuthState(state)) {
    response.redirect(buildPostConnectRedirect({ oura: "invalid_state" }));

    return;
  }

  try {
    const tokenResponse = await exchangeCodeForOuraTokens(code);

    await storeOuraConnection(tokenResponse, scope);

    response.redirect(buildPostConnectRedirect({ oura: "connected" }));
  } catch (error) {
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

  response.json({
    ...result,
    connected: false
  });
});
