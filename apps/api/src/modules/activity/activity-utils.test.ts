import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWeekRange,
  normalizeActivityType,
  startOfWeek
} from "./activity-utils.js";

test("normalizeActivityType groups common workout labels into consistent buckets", () => {
  assert.deepEqual(normalizeActivityType("indoor_rowing"), {
    key: "rowing",
    label: "Rowing"
  });
  assert.deepEqual(normalizeActivityType("strength_training"), {
    key: "weight_lifting",
    label: "Weight Lifting"
  });
  assert.deepEqual(normalizeActivityType("kayak"), {
    key: "kayaking",
    label: "Kayaking"
  });
  assert.deepEqual(normalizeActivityType("(rawvalue: 52)"), {
    key: "unmapped",
    label: "Unmapped Activity"
  });
});

test("startOfWeek returns Monday in UTC", () => {
  assert.equal(startOfWeek("2026-05-20"), "2026-05-18");
  assert.equal(startOfWeek("2026-05-24"), "2026-05-18");
});

test("buildWeekRange covers the requested number of consecutive weeks", () => {
  assert.deepEqual(buildWeekRange("2026-05-20", 3), [
    {
      weekStartDay: "2026-05-04",
      weekEndDay: "2026-05-10"
    },
    {
      weekStartDay: "2026-05-11",
      weekEndDay: "2026-05-17"
    },
    {
      weekStartDay: "2026-05-18",
      weekEndDay: "2026-05-24"
    }
  ]);
});
