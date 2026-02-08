export type ReminderMinutes = number | null;

export const REMINDER_STORAGE_KEY = "study-buddy:reminder-minutes";
export const DEFAULT_REMINDER_MINUTES: ReminderMinutes = 1440;

export const REMINDER_OPTIONS: Array<{ label: string; value: ReminderMinutes }> = [
  { label: "None", value: null },
  { label: "At time", value: 0 },
  { label: "1 hour before", value: 60 },
  { label: "1 day before", value: 1440 },
];

export function loadReminderMinutes(): ReminderMinutes {
  if (typeof window === "undefined") return DEFAULT_REMINDER_MINUTES;
  try {
    const raw = window.localStorage.getItem(REMINDER_STORAGE_KEY);
    if (!raw) return DEFAULT_REMINDER_MINUTES;
    if (raw === "none") return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return DEFAULT_REMINDER_MINUTES;
    return n;
  } catch {
    return DEFAULT_REMINDER_MINUTES;
  }
}

export function saveReminderMinutes(value: ReminderMinutes) {
  if (typeof window === "undefined") return;
  try {
    if (value == null) window.localStorage.setItem(REMINDER_STORAGE_KEY, "none");
    else window.localStorage.setItem(REMINDER_STORAGE_KEY, String(value));
  } catch {
    // ignore
  }
}
