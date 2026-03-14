import test from "node:test";
import assert from "node:assert/strict";

import { buildRecoveryExplanation, calculateRecoveryMetrics } from "./recovery-score.service.js";

test("calculateRecoveryMetrics rewards favorable signals", () => {
  const result = calculateRecoveryMetrics({
    hrvDelta: 12,
    restingHrDelta: -4,
    sleepDeltaSeconds: 60 * 60,
    temperatureDelta: 0.05,
    confidenceSignals: 4
  });

  assert.equal(result.score, 98);
  assert.equal(result.confidence, 1);
  assert.equal(result.hrvContribution, 1);
  assert.equal(result.restingHrContribution, 0.667);
  assert.ok(result.explanationSummary.includes("HRV is above baseline"));
});

test("calculateRecoveryMetrics penalizes unfavorable signals", () => {
  const result = calculateRecoveryMetrics({
    hrvDelta: -18,
    restingHrDelta: 8,
    sleepDeltaSeconds: -(2 * 60 * 60),
    temperatureDelta: 0.6,
    confidenceSignals: 2
  });

  assert.equal(result.score, 48);
  assert.equal(result.confidence, 0.5);
  assert.equal(result.hrvContribution, -1);
  assert.equal(result.temperatureContribution, -1);
});

test("buildRecoveryExplanation stays human readable", () => {
  const explanation = buildRecoveryExplanation({
    hrvDelta: 0,
    restingHrDelta: 3,
    sleepDeltaSeconds: -1800,
    temperatureDelta: 0.35
  });

  assert.ok(explanation.startsWith("Recovery reflects a mix of signals:"));
  assert.ok(explanation.includes("near baseline"));
  assert.ok(explanation.includes("elevated versus baseline"));
});
