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
  const diffMs = Math.min(0, date.getTime() - now.getTime());
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (Math.abs(diffDays) > 30) {
    return date.toLocaleDateString(locale);
  } else if (Math.abs(diffDays) >= 1) {
    return rtf.format(diffDays, "day");
  } else if (Math.abs(diffHours) >= 1) {
    return rtf.format(diffHours, "hour");
  } else if (Math.abs(diffMins) >= 1) {
    return rtf.format(diffMins, "minute");
  } else {
    return rtf.format(diffSecs, "second");
  }
}
