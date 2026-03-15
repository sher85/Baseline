import type { Request, Response, NextFunction, RequestHandler } from "express";

type RateLimitOptions = {
  keyPrefix: string;
  windowMs: number;
  maxRequests: number;
  message?: string;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function resolveClientKey(request: Request) {
  const forwardedFor = request.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.trim().length > 0) {
    return forwardedFor.split(",")[0]?.trim() ?? request.ip;
  }

  return request.ip || "unknown";
}

export function createRateLimitMiddleware(options: RateLimitOptions): RequestHandler {
  const { keyPrefix, maxRequests, message, windowMs } = options;

  return (request: Request, response: Response, next: NextFunction) => {
    const now = Date.now();
    const clientKey = `${keyPrefix}:${resolveClientKey(request)}`;
    const existingEntry = rateLimitStore.get(clientKey);

    if (!existingEntry || existingEntry.resetAt <= now) {
      rateLimitStore.set(clientKey, {
        count: 1,
        resetAt: now + windowMs
      });

      response.setHeader("X-RateLimit-Limit", String(maxRequests));
      response.setHeader("X-RateLimit-Remaining", String(Math.max(maxRequests - 1, 0)));

      next();
      return;
    }

    if (existingEntry.count >= maxRequests) {
      const retryAfterSeconds = Math.max(Math.ceil((existingEntry.resetAt - now) / 1000), 1);

      response.setHeader("Retry-After", String(retryAfterSeconds));
      response.setHeader("X-RateLimit-Limit", String(maxRequests));
      response.setHeader("X-RateLimit-Remaining", "0");
      response.status(429).json({
        error: message ?? "Too many requests. Please wait and try again."
      });
      return;
    }

    existingEntry.count += 1;
    rateLimitStore.set(clientKey, existingEntry);

    response.setHeader("X-RateLimit-Limit", String(maxRequests));
    response.setHeader("X-RateLimit-Remaining", String(Math.max(maxRequests - existingEntry.count, 0)));

    next();
  };
}
