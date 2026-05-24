import assert from "node:assert/strict";
import test from "node:test";

import {
  buildIngestKey,
  createFallbackKey
} from "./apple-health-ingestion.service.js";

test("createFallbackKey is deterministic for the same Apple Health record shape", () => {
  const first = createFallbackKey([
    "workout",
    "running",
    "2026-05-20T12:00:00.000Z",
    "2026-05-20T12:30:00.000Z",
    320,
    5000
  ]);
  const second = createFallbackKey([
    "workout",
    "running",
    "2026-05-20T12:00:00.000Z",
    "2026-05-20T12:30:00.000Z",
    320,
    5000
  ]);

  assert.equal(first, second);
});

test("createFallbackKey changes when a distinguishing field changes", () => {
  const first = createFallbackKey([
    "workout",
    "running",
    "2026-05-20T12:00:00.000Z",
    "2026-05-20T12:30:00.000Z",
    320,
    5000
  ]);
  const second = createFallbackKey([
    "workout",
    "running",
    "2026-05-20T12:00:00.000Z",
    "2026-05-20T12:30:00.000Z",
    280,
    5000
  ]);

  assert.notEqual(first, second);
});

test("buildIngestKey prefers the external identifier when present", () => {
  assert.equal(
    buildIngestKey("workout", "apple-health-uuid", "fallback-value"),
    "workout:apple-health-uuid"
  );
});

test("buildIngestKey falls back to the deterministic key when no external identifier exists", () => {
  assert.equal(
    buildIngestKey("step_count", undefined, "fallback-value"),
    "step_count:fallback:fallback-value"
  );
});
