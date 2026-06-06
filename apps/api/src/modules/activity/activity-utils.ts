function toWords(value: string) {
  return value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (match) => match.toUpperCase());
}

export function asUtcDate(day: string) {
  return new Date(`${day}T00:00:00.000Z`);
}

export function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(day: string, delta: number) {
  const date = asUtcDate(day);
  date.setUTCDate(date.getUTCDate() + delta);

  return formatDate(date);
}

export function createDateRange(endDay: string, days: number) {
  return Array.from({ length: days }, (_, index) =>
    addDays(endDay, -(days - 1) + index)
  );
}

export function startOfWeek(day: string) {
  const date = asUtcDate(day);
  const weekday = date.getUTCDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;

  date.setUTCDate(date.getUTCDate() + delta);

  return formatDate(date);
}

export function buildWeekRange(endDay: string, weeks: number) {
  const latestWeekStart = startOfWeek(endDay);

  return Array.from({ length: weeks }, (_, index) => {
    const weekStartDay = addDays(latestWeekStart, (index - (weeks - 1)) * 7);

    return {
      weekStartDay,
      weekEndDay: addDays(weekStartDay, 6)
    };
  });
}

export function normalizeActivityType(activityType: string | null | undefined) {
  const fallback = {
    key: "other",
    label: "Other"
  };

  if (!activityType) {
    return fallback;
  }

  const words = toWords(activityType);

  if (!words) {
    return fallback;
  }

  if (/^\(?rawvalue:?\s*\d+\)?$/.test(words)) {
    return fallback;
  }

  const mappings: Array<{ includes: string[]; key: string; label: string }> = [
    { includes: ["run", "running", "jog"], key: "running", label: "Running" },
    { includes: ["row", "rowing", "erg"], key: "rowing", label: "Rowing" },
    { includes: ["kayak", "paddle", "canoe"], key: "kayaking", label: "Kayaking" },
    { includes: ["walk", "hike"], key: "walking", label: "Walking" },
    { includes: ["cycle", "cycling", "bike", "biking", "spin"], key: "cycling", label: "Cycling" },
    { includes: ["swim", "swimming"], key: "swimming", label: "Swimming" },
    {
      includes: ["weight lifting", "weightlifting", "strength", "weights", "gym"],
      key: "weight_lifting",
      label: "Weight Lifting"
    },
    {
      includes: ["workout", "training", "crossfit"],
      key: "workout",
      label: "Workout"
    },
    { includes: ["yoga", "pilates"], key: "mindful", label: "Yoga & Pilates" }
  ];

  const match = mappings.find((candidate) =>
    candidate.includes.some((term) => words.includes(term))
  );

  if (match) {
    return {
      key: match.key,
      label: match.label
    };
  }

  return {
    key: words.replace(/[^a-z0-9]+/g, "_"),
    label: titleCase(words)
  };
}
