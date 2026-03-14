import assert from "node:assert/strict";
import test from "node:test";

import {
  OuraApiRequestError,
  OuraAuthenticationError,
  isLikelyOuraAuthenticationFailure,
  isOuraAuthenticationError
} from "./oura-errors.js";

test("isLikelyOuraAuthenticationFailure detects invalid OAuth grants", () => {
  const error = new OuraApiRequestError("invalid grant", {
    source: "oauth",
    status: 400,
    errorCode: "invalid_grant"
  });

  assert.equal(isLikelyOuraAuthenticationFailure(error), true);
});

test("isLikelyOuraAuthenticationFailure detects unauthorized API responses", () => {
  const error = new OuraApiRequestError("unauthorized", {
    source: "api",
    status: 401
  });

  assert.equal(isLikelyOuraAuthenticationFailure(error), true);
});

test("isLikelyOuraAuthenticationFailure ignores non-auth Oura request errors", () => {
  const error = new OuraApiRequestError("server error", {
    source: "api",
    status: 500
  });

  assert.equal(isLikelyOuraAuthenticationFailure(error), false);
});

test("isOuraAuthenticationError only matches explicit reconnect errors", () => {
  assert.equal(isOuraAuthenticationError(new OuraAuthenticationError("reauth")), true);
  assert.equal(isOuraAuthenticationError(new Error("generic failure")), false);
});
