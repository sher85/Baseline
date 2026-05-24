import assert from "node:assert/strict";
import test from "node:test";

import type { NextFunction, Request, Response } from "express";

import {
  createBearerTokenGuard,
  parseBearerToken
} from "./api-token-auth.js";

function createResponseRecorder() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;

      return this;
    },
    json(payload: unknown) {
      this.body = payload;

      return this;
    }
  };
}

test("parseBearerToken extracts bearer tokens and rejects malformed headers", () => {
  assert.equal(parseBearerToken("Bearer abc123"), "abc123");
  assert.equal(parseBearerToken("Bearer    abc123   "), "abc123");
  assert.equal(parseBearerToken("Basic abc123"), null);
  assert.equal(parseBearerToken("Bearer   "), null);
  assert.equal(parseBearerToken(undefined), null);
});

test("createBearerTokenGuard returns 503 when the server token is missing", () => {
  const middleware = createBearerTokenGuard({
    token: undefined,
    missingConfigMessage: "Missing config",
    missingTokenMessage: "Missing token",
    invalidTokenMessage: "Invalid token"
  });
  const response = createResponseRecorder();
  let nextCalled = false;

  middleware(
    { headers: {} } as Request,
    response as unknown as Response,
    (() => {
      nextCalled = true;
    }) as NextFunction
  );

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body, {
    error: "Missing config"
  });
  assert.equal(nextCalled, false);
});

test("createBearerTokenGuard returns 401 when the request token is missing or invalid", () => {
  const middleware = createBearerTokenGuard({
    token: "expected-token",
    missingConfigMessage: "Missing config",
    missingTokenMessage: "Missing token",
    invalidTokenMessage: "Invalid token"
  });

  const missingTokenResponse = createResponseRecorder();
  middleware(
    { headers: {} } as Request,
    missingTokenResponse as unknown as Response,
    (() => undefined) as NextFunction
  );
  assert.equal(missingTokenResponse.statusCode, 401);
  assert.deepEqual(missingTokenResponse.body, {
    error: "Missing token"
  });

  const invalidTokenResponse = createResponseRecorder();
  middleware(
    {
      headers: {
        authorization: "Bearer wrong-token"
      }
    } as Request,
    invalidTokenResponse as unknown as Response,
    (() => undefined) as NextFunction
  );
  assert.equal(invalidTokenResponse.statusCode, 401);
  assert.deepEqual(invalidTokenResponse.body, {
    error: "Invalid token"
  });
});

test("createBearerTokenGuard calls next when the bearer token matches", () => {
  const middleware = createBearerTokenGuard({
    token: "expected-token",
    missingConfigMessage: "Missing config",
    missingTokenMessage: "Missing token",
    invalidTokenMessage: "Invalid token"
  });
  const response = createResponseRecorder();
  let nextCalled = false;

  middleware(
    {
      headers: {
        authorization: "Bearer expected-token"
      }
    } as Request,
    response as unknown as Response,
    (() => {
      nextCalled = true;
    }) as NextFunction
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body, undefined);
  assert.equal(nextCalled, true);
});
