export function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatINROrDash(value: number | null | undefined) {
  return value == null ? "—" : formatINR(value);
}

export function formatPercent(value: number | null | undefined) {
  if (value == null) return "—";
  const shown = value > 1 ? Math.round(value) : Math.round(value * 100);
  return `${shown}%`;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDay(isoDate: string) {
  if (!isoDate) return "—";
  const date =
    isoDate.length === 10 ? new Date(`${isoDate}T12:00:00+05:30`) : new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatStamp(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function confidenceWord(value: number) {
  if (value >= 0.85) return "High";
  if (value >= 0.7) return "Moderate";
  return "Limited";
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
