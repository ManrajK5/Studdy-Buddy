export type GoogleCalendarInsertableEvent = {
  summary: string;
  description?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: "popup" | "email"; minutes: number }>;
  };
};

export type ParsedSyllabusEvent = {
  title: string;
  type: "quiz" | "assignment" | "exam";
  date: string;
  description: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(payloadText: string) {
  try {
    const parsed = JSON.parse(payloadText) as {
      error?: { errors?: Array<{ reason?: string }>; status?: string };
    };
    const reason = parsed.error?.errors?.[0]?.reason;
    return reason === "rateLimitExceeded" || reason === "userRateLimitExceeded";
  } catch {
    return false;
  }
}

async function readResponseText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  {
    maxRetries,
    baseDelayMs,
  }: {
    maxRetries: number;
    baseDelayMs: number;
  },
) {
  let attempt = 0;
  while (true) {
    const res = await fetch(input, init);
    if (res.ok) return res;

    const payloadText = await readResponseText(res);
    const retryable =
      res.status === 429 ||
      (res.status === 403 && isRateLimitError(payloadText)) ||
      res.status >= 500;

    if (!retryable || attempt >= maxRetries) {
      throw new Error(
        `Google Calendar insert failed (${res.status}): ${payloadText}`,
      );
    }

    const jitter = 0.6 + Math.random() * 0.8;
    const delay = Math.round(baseDelayMs * 2 ** attempt * jitter);
    await sleep(delay);
    attempt += 1;
  }
}

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function addOneDay(dateOnly: string) {
  const [y, m, d] = dateOnly.split("-").map((x) => Number(x));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function mapParsedEventToGoogle(
  e: ParsedSyllabusEvent,
  timeZone = "UTC",
): GoogleCalendarInsertableEvent {
  const summary = `${e.type.toUpperCase()}: ${e.title}`;

  if (isDateOnly(e.date)) {
    return {
      summary,
      description: e.description,
      start: { date: e.date },
      end: { date: addOneDay(e.date) },
    };
  }

  // Treat as an ISO date-time string if time is included
  return {
    summary,
    description: e.description,
    start: { dateTime: e.date, timeZone },
    end: { dateTime: e.date, timeZone },
  };
}

export async function batchCreateGoogleCalendarEvents({
  accessToken,
  calendarId = "primary",
  events,
  timeZone = "UTC",
  reminderMinutes,
}: {
  accessToken: string;
  calendarId?: string;
  events: ParsedSyllabusEvent[];
  timeZone?: string;
  reminderMinutes?: number | null;
}) {
  // Limit concurrency + retry on rate limits
  const mapped = events.map((e) => {
    const base = mapParsedEventToGoogle(e, timeZone);
    if (reminderMinutes === undefined) return base;
    if (reminderMinutes === null) {
      return {
        ...base,
        reminders: { useDefault: false },
      };
    }
    return {
      ...base,
      reminders: {
        useDefault: false,
        overrides: [{ method: "popup", minutes: reminderMinutes }],
      },
    };
  });

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
    calendarId,
  )}/events`;

  const concurrency = 3;
  const maxRetries = 6;
  const baseDelayMs = 500;

  const results: unknown[] = [];
  let cursor = 0;

  async function worker() {
    while (true) {
      const i = cursor;
      cursor += 1;
      if (i >= mapped.length) return;

      const ev = mapped[i];
      const res = await fetchWithRetry(
        url,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(ev),
        },
        { maxRetries, baseDelayMs },
      );
      results[i] = await res.json();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, mapped.length) }, () =>
    worker(),
  );
  await Promise.all(workers);

  return results;
}
