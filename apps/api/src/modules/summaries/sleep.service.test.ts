import assert from "node:assert/strict";
import test from "node:test";

import { computeBedtimeConsistency } from "./sleep.service.js";

test("computeBedtimeConsistency treats after-midnight bedtimes as part of the same nightly band", () => {
  const consistency = computeBedtimeConsistency([
    {
      day: "2026-03-10T00:00:00.000Z",
      bedtimeStart: "2026-03-10T22:30:00.000Z",
      clockMinutes: 22 * 60 + 30
    },
    {
      day: "2026-03-11T00:00:00.000Z",
      bedtimeStart: "2026-03-11T23:00:00.000Z",
      clockMinutes: 23 * 60
    },
    {
      day: "2026-03-12T00:00:00.000Z",
      bedtimeStart: "2026-03-13T00:15:00.000Z",
      clockMinutes: 15
    }
  ]);

  assert.ok(consistency);
  assert.equal(consistency.averageClockMinutes, 23 * 60 + 15);
  assert.equal(consistency.latestOffsetMinutes, 60);
  assert.equal(consistency.status, "mixed");
});

test("computeBedtimeConsistency marks very tight bedtime clusters as steady", () => {
  const consistency = computeBedtimeConsistency([
    {
      day: "2026-03-10T00:00:00.000Z",
      bedtimeStart: "2026-03-10T22:40:00.000Z",
      clockMinutes: 22 * 60 + 40
    },
    {
      day: "2026-03-11T00:00:00.000Z",
      bedtimeStart: "2026-03-11T22:55:00.000Z",
      clockMinutes: 22 * 60 + 55
    },
    {
      day: "2026-03-12T00:00:00.000Z",
      bedtimeStart: "2026-03-12T22:50:00.000Z",
      clockMinutes: 22 * 60 + 50
    },
    {
      day: "2026-03-13T00:00:00.000Z",
      bedtimeStart: "2026-03-13T22:45:00.000Z",
      clockMinutes: 22 * 60 + 45
    }
  ]);

  assert.ok(consistency);
  assert.equal(consistency.status, "steady");
  assert.ok(consistency.averageDeviationMinutes <= 10);
});
