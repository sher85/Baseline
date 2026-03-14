import test from "node:test";
import assert from "node:assert/strict";

import { detectAnomalies } from "./anomaly.service.js";

test("detectAnomalies returns all triggered anomaly types", () => {
  const anomalies = detectAnomalies({
    baseline: {
      hrvBaseline: 40,
      restingHrBaseline: 50,
      sleepDurationBaseline: 8 * 60 * 60,
      temperatureBaseline: 0
    },
    recoveryInput: {
      hrv: 28,
      restingHeartRate: 56,
      temperatureDeviation: 0.4
    },
    sleep: {
      totalSleepSeconds: 6 * 60 * 60
    }
  });

  assert.deepEqual(
    anomalies.map((anomaly) => anomaly.type),
    ["low_hrv", "elevated_resting_hr", "temperature_shift", "short_sleep"]
  );
});

test("detectAnomalies returns no anomalies when values are near baseline", () => {
  const anomalies = detectAnomalies({
    baseline: {
      hrvBaseline: 40,
      restingHrBaseline: 50,
      sleepDurationBaseline: 8 * 60 * 60,
      temperatureBaseline: 0.02
    },
    recoveryInput: {
      hrv: 39,
      restingHeartRate: 52,
      temperatureDeviation: 0.15
    },
    sleep: {
      totalSleepSeconds: 7.5 * 60 * 60
    }
  });

  assert.equal(anomalies.length, 0);
});
