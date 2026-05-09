import type { FamilyMember, Frequency, Job, JobCompletion, JobOverride } from "./types";

export const FREQ_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

export const FREQ_LABELS: Record<Frequency, string> = {
  once: "One-time",
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
  custom: "Custom",
};

// Date helpers
export function dateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateStr(str: string): Date {
  return new Date(str + "T12:00:00");
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function daysBetween(d1: Date, d2: Date): number {
  const a = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const b = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function todayStr(): string {
  return dateStr(new Date());
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return "";
  const date = new Date(d + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Display name lookup
export function getDisplayName(
  nameOrPerson: string | FamilyMember | null | undefined,
  family?: FamilyMember[],
): string {
  if (!nameOrPerson) return "";
  if (typeof nameOrPerson === "string") {
    if (nameOrPerson === "Everyone" || nameOrPerson === "Unassigned") return nameOrPerson;
    if (family) {
      const found = family.find((f) => f.name === nameOrPerson);
      if (found?.preferred_name?.trim()) return found.preferred_name.trim();
    }
    return nameOrPerson.split(" ")[0];
  }
  if (nameOrPerson.preferred_name?.trim()) return nameOrPerson.preferred_name.trim();
  return nameOrPerson.name.split(" ")[0];
}

// Job helpers
export function getJobIntervalDays(job: Job): number {
  if (job.frequency === "once") return Infinity;
  if (job.frequency === "custom") return job.custom_days || 7;
  return FREQ_DAYS[job.frequency] || 7;
}

export function isJobScheduledOnDate(job: Job, date: Date): boolean {
  if (job.frequency === "once") return dateStr(date) === job.start_date;
  const start = parseDateStr(job.start_date);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  if (target < new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12))
    return false;
  const interval = getJobIntervalDays(job);
  const diff = daysBetween(start, target);
  return diff >= 0 && diff % interval === 0;
}

export function getCycleForDate(job: Job, date: Date): number {
  const start = parseDateStr(job.start_date);
  const interval = getJobIntervalDays(job);
  return Math.floor(daysBetween(start, date) / interval);
}

export function getRotationAssigneeForDate(job: Job, date: Date): string {
  if (!job.rotation || job.rotation.length === 0) return "Unassigned";
  const cycle = getCycleForDate(job, date);
  return job.rotation[cycle % job.rotation.length];
}

export function getAssigneeForDate(
  job: Job,
  date: Date,
  overrides: JobOverride[],
): string {
  const ds = dateStr(date);
  const ov = overrides.find((o) => o.job_id === job.id && o.date === ds);
  if (ov?.assignee) return ov.assignee;
  return getRotationAssigneeForDate(job, date);
}

export function getNameForDate(
  job: Job,
  date: Date,
  overrides: JobOverride[],
): string {
  const ds = dateStr(date);
  const ov = overrides.find((o) => o.job_id === job.id && o.date === ds);
  return ov?.name || job.name;
}

export function getNotesForDate(
  job: Job,
  date: Date,
  overrides: JobOverride[],
): string {
  const ds = dateStr(date);
  const ov = overrides.find((o) => o.job_id === job.id && o.date === ds);
  return ov?.notes || "";
}

export function getCompletionForDate(
  job: Job,
  date: Date,
  completions: JobCompletion[],
): JobCompletion | null {
  const ds = dateStr(date);
  return completions.find((c) => c.job_id === job.id && c.date === ds) || null;
}

export function hasInstanceOverride(
  job: Job,
  date: Date,
  overrides: JobOverride[],
): boolean {
  const ds = dateStr(date);
  return overrides.some((o) => o.job_id === job.id && o.date === ds);
}

export function escapeHtml(text: string | null | undefined): string {
  if (text == null) return "";
  return String(text).replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[c];
  });
}
