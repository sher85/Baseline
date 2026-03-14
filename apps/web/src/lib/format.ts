export function formatOverviewDate(isoDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
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
