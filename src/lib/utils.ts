import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatRelativeTime(date: Date, locale: string = "en"): string {
  const now = new Date();
  const dateTs = date.getTime();
  if (!Number.isFinite(dateTs)) return "";

  const diffMs = now.getTime() - dateTs;
  const absMs = Math.abs(diffMs);
  const diffSecs = Math.floor(absMs / 1000);
  const diffMins = Math.floor(absMs / (1000 * 60));
  const diffHours = Math.floor(absMs / (1000 * 60 * 60));
  const diffDays = Math.floor(absMs / (1000 * 60 * 60 * 24));

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const rtfValue = (value: number) => (diffMs >= 0 ? -value : value);

  if (diffDays > 30) {
    return date.toLocaleDateString(locale);
  } else if (diffDays >= 1) {
    return rtf.format(rtfValue(diffDays), "day");
  } else if (diffHours >= 1) {
    return rtf.format(rtfValue(diffHours), "hour");
  } else if (diffMins >= 1) {
    return rtf.format(rtfValue(diffMins), "minute");
  } else {
    const secValueForPastOrFuture = diffMs >= 0 ? Math.max(diffSecs, 1) : diffSecs;
    // Keep past timestamps from showing "0 seconds ago", while allowing future values like "now".
    return rtf.format(rtfValue(secValueForPastOrFuture), "second");
  }
}
