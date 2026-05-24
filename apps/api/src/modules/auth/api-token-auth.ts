import { timingSafeEqual } from "node:crypto";

import type { NextFunction, Request, Response } from "express";

import { env } from "../../config/env.js";

type BearerTokenGuardOptions = {
  invalidTokenMessage: string;
  missingConfigMessage: string;
  missingTokenMessage: string;
  token: string | undefined;
};

function constantTimeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function parseBearerToken(authorizationHeader: string | undefined) {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();

  return token.length > 0 ? token : null;
}

export function isApiTokenConfigured() {
  return Boolean(env.API_TOKEN);
}

export function createBearerTokenGuard(options: BearerTokenGuardOptions) {
  return function requireBearerToken(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    if (!options.token) {
      response.status(503).json({
        error: options.missingConfigMessage
      });

      return;
    }

    const token = parseBearerToken(request.headers.authorization);

    if (!token) {
      response.status(401).json({
        error: options.missingTokenMessage
      });

      return;
    }

    if (!constantTimeEquals(token, options.token)) {
      response.status(401).json({
        error: options.invalidTokenMessage
      });

      return;
    }

    next();
  };
}

export const requireApiToken = createBearerTokenGuard({
  token: env.API_TOKEN,
  missingConfigMessage: "Protected API routes are not configured in the local environment.",
  missingTokenMessage: "Bearer token is required for this route.",
  invalidTokenMessage: "Bearer token is invalid."
});
