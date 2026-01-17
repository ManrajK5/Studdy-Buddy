export type GoogleCalendarInsertableEvent = {
  summary: string;
  description?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
};

export type ParsedSyllabusEvent = {
  title: string;
  type: "quiz" | "assignment" | "exam";
  date: string;
  description: string;
};

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

  // Treat as an ISO date-time string if it includes time.
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
}: {
  accessToken: string;
  calendarId?: string;
  events: ParsedSyllabusEvent[];
  timeZone?: string;
}) {
  // Note: This is a simple batch (parallel requests), not Google's legacy multipart /batch endpoint.
  const mapped = events.map((e) => mapParsedEventToGoogle(e, timeZone));

  const results = await Promise.all(
    mapped.map(async (ev) => {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          calendarId,
        )}/events`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(ev),
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Google Calendar insert failed (${res.status}): ${text}`);
      }

      return res.json();
    }),
  );

  return results;
}
