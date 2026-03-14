export function formatOverviewDate(isoDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(isoDate));
}

export function formatShortDate(isoDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(new Date(isoDate));
}

export function formatSyncTime(isoDate: string | null) {
  if (!isoDate) {
    return "No sync recorded yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric"
  }).format(new Date(isoDate));
}

export function formatDuration(seconds: number | null) {
  if (seconds === null) {
    return "--";
  }

  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

export function formatSignedMinutes(seconds: number | null) {
  if (seconds === null) {
    return "Baseline warming up";
  }

  const minutes = Math.round(seconds / 60);
  const sign = minutes > 0 ? "+" : "";

  return `${sign}${minutes} min`;
}

export function formatNumber(value: number | null, digits = 0) {
  if (value === null) {
    return "--";
  }

  return value.toFixed(digits);
}

export function formatPercent(value: number | null) {
  if (value === null) {
    return "--";
  }

  return `${Math.round(value)}%`;
}

export function formatTemperature(value: number | null) {
  if (value === null) {
    return "--";
  }

  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)} degC`;
}
