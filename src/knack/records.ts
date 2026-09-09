import type { KnackRecord } from "./api";

/** Knack returns field_N (display HTML) and field_N_raw (structured). Logic uses _raw. */
export function raw<T = any>(record: KnackRecord, field: string): T | undefined {
  return record[`${field}_raw`] as T | undefined;
}

/** Display value, stripped of the HTML Knack wraps some formatted fields in. */
export function display(record: KnackRecord, field: string): string {
  const v = record[field];
  if (v == null) return "";
  return String(v).replace(/<[^>]*>/g, "").trim();
}

export type ConnectionValue = { id: string; identifier: string };

export function connection(record: KnackRecord, field: string): ConnectionValue | null {
  const v = raw<ConnectionValue[]>(record, field);
  return Array.isArray(v) && v.length > 0 ? v[0] : null;
}

export type DateTimeRaw = {
  date?: string;
  hours?: number;
  minutes?: number;
  am_pm?: string;
  iso_timestamp?: string;
  unix_timestamp?: number;
};

export function dateOf(record: KnackRecord, field: string): Date | null {
  const v = raw<DateTimeRaw>(record, field);
  if (!v) return null;
  if (v.iso_timestamp) {
    const d = new Date(v.iso_timestamp);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (typeof v.unix_timestamp === "number") return new Date(v.unix_timestamp);
  return null;
}

export function formatDateTime(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric",
    year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Knack date_time writes take MM/DD/YYYY plus a 12-hour time string. */
export function toKnackDateTime(local: string): { date: string; time: string; all_day: boolean } {
  const d = new Date(local);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  let h = d.getHours();
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  const min = String(d.getMinutes()).padStart(2, "0");
  return { date: `${mm}/${dd}/${yyyy}`, time: `${h}:${min} ${ampm}`, all_day: false };
}

export type FileRaw = {
  id: string;
  filename: string;
  signed_url?: string;
  signed_url_inline?: string;
  thumb_url?: string;
  size?: number;
};

export function fileOf(record: KnackRecord, field: string): FileRaw | null {
  return raw<FileRaw>(record, field) ?? null;
}

