import test from "node:test";
import assert from "node:assert/strict";

import { average, clamp, median, round } from "./analytics-math.js";

test("average returns null for empty arrays", () => {
  assert.equal(average([]), null);
});

test("average computes mean for numeric values", () => {
  assert.equal(average([10, 20, 30]), 20);
});

test("median computes odd and even medians", () => {
  assert.equal(median([4, 1, 9]), 4);
  assert.equal(median([1, 5, 9, 13]), 7);
});

test("round and clamp keep numeric outputs bounded", () => {
  assert.equal(round(3.14159, 2), 3.14);
  assert.equal(clamp(14, 0, 10), 10);
  assert.equal(clamp(-4, 0, 10), 0);
});
