import { randomBytes } from "node:crypto";

import { z } from "zod";

import { env } from "../../config/env.js";
import { OuraApiRequestError } from "./oura-errors.js";

const ouraTokenResponseSchema = z.object({
  token_type: z.literal("bearer"),
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  refresh_token: z.string().min(1),
  scope: z.string().optional()
});

const OURA_AUTHORIZE_URL = "https://cloud.ouraring.com/oauth/authorize";
const OURA_TOKEN_URL = "https://api.ouraring.com/oauth/token";

export type OuraTokenResponse = z.infer<typeof ouraTokenResponseSchema>;

export function getMissingOuraConfiguration() {
  const missing: string[] = [];

  if (!env.OURA_CLIENT_ID) {
    missing.push("OURA_CLIENT_ID");
  }

  if (!env.OURA_CLIENT_SECRET) {
    missing.push("OURA_CLIENT_SECRET");
  }

  if (!env.OURA_REDIRECT_URI) {
    missing.push("OURA_REDIRECT_URI");
  }

  return missing;
}

export function getRequestedOuraScopes() {
  return env.OURA_SCOPES.split(/\s+/).filter(Boolean);
}

export function isOuraConfigured() {
  return getMissingOuraConfiguration().length === 0;
}

export function createOAuthState() {
  return randomBytes(24).toString("hex");
}

export function buildOuraAuthorizationUrl(state: string) {
  const url = new URL(OURA_AUTHORIZE_URL);

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env.OURA_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", env.OURA_REDIRECT_URI);
  url.searchParams.set("scope", getRequestedOuraScopes().join(" "));
  url.searchParams.set("state", state);

  return url.toString();
}

export function buildPostConnectRedirect(params: Record<string, string>) {
  const url = new URL(env.WEB_APP_URL);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

async function requestOuraToken(body: URLSearchParams) {
  const response = await fetch(OURA_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const errorCode =
      payload && typeof payload === "object" && "error" in payload
        ? String(payload.error)
        : undefined;

    throw new OuraApiRequestError(
      `Oura token request failed with status ${response.status}${errorCode ? `: ${errorCode}` : ""}`,
      {
        source: "oauth",
        status: response.status,
        errorCode
      }
    );
  }

  return ouraTokenResponseSchema.parse(payload);
}

export async function exchangeCodeForOuraTokens(code: string) {
  if (!isOuraConfigured()) {
    throw new Error("Oura OAuth is not configured.");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: env.OURA_REDIRECT_URI,
    client_id: env.OURA_CLIENT_ID ?? "",
    client_secret: env.OURA_CLIENT_SECRET ?? ""
  });

  return requestOuraToken(body);
}

export async function refreshOuraTokens(refreshToken: string) {
  if (!isOuraConfigured()) {
    throw new Error("Oura OAuth is not configured.");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: env.OURA_CLIENT_ID ?? "",
    client_secret: env.OURA_CLIENT_SECRET ?? ""
  });

  return requestOuraToken(body);
}
