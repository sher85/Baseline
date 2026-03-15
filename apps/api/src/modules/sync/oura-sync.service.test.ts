import test from "node:test";
import assert from "node:assert/strict";

import { resolveSyncWindowFromState } from "./sync-window.js";

test("resolveSyncWindowFromState respects explicit ranges", () => {
  const window = resolveSyncWindowFromState({
    today: "2026-03-14",
    startDate: "2026-03-01",
    endDate: "2026-03-10"
  });

  assert.deepEqual(window, {
    startDate: "2026-03-01",
    endDate: "2026-03-10"
  });
});

test("resolveSyncWindowFromState derives lookback ranges", () => {
  const window = resolveSyncWindowFromState({
    today: "2026-03-14",
    endDate: "2026-03-14",
    lookbackDays: 7
  });

  assert.deepEqual(window, {
    startDate: "2026-03-08",
    endDate: "2026-03-14"
  });
});

test("resolveSyncWindowFromState reuses a safe resync window when history exists", () => {
  const window = resolveSyncWindowFromState({
    today: "2026-03-14",
    latestSyncedDay: "2026-03-12"
  });

  assert.deepEqual(window, {
    startDate: "2026-03-09",
    endDate: "2026-03-14"
  });
});

test("resolveSyncWindowFromState falls back to the initial 30-day backfill", () => {
  const window = resolveSyncWindowFromState({
    today: "2026-03-14"
  });

  assert.deepEqual(window, {
    startDate: "2026-02-13",
    endDate: "2026-03-14"
  });
});
