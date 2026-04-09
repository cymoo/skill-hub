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
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (diffDays > 30) {
    return date.toLocaleDateString(locale);
  } else if (diffDays >= 1) {
    return rtf.format(-diffDays, "day");
  } else if (diffHours >= 1) {
    return rtf.format(-diffHours, "hour");
  } else if (diffMins >= 1) {
    return rtf.format(-diffMins, "minute");
  } else {
    return rtf.format(-diffSecs, "second");
  }
}
