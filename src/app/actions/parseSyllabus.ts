"use server";

import { z } from "zod";

const ParsedEventSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["quiz", "assignment", "exam"]),
  date: z.string().min(1),
  description: z.string().default(""),
});

const ParsedSyllabusSchema = z.object({
  summary: z.object({
    quizzes: z.number().int().nonnegative(),
    assignments: z.number().int().nonnegative(),
    exams: z.number().int().nonnegative(),
  }),
  events: z.array(ParsedEventSchema),
});

export type ParsedSyllabus = z.infer<typeof ParsedSyllabusSchema>;

function normalizeLikelyWrongYear(iso: string, now: Date): string {
  // If year looks like it's from past sem, rewrite to curr yr
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})(.*)$/);
  if (!m) return iso;

  const year = Number(m[1]);
  const month = m[2];
  const day = m[3];
  const rest = m[4] ?? "";

  const currentYear = now.getFullYear();
  if (!Number.isFinite(year)) return iso;

  // Only rewrite when the year is clearly stale (2+ years behind).
  if (year <= currentYear - 2) {
    return `${currentYear}-${month}-${day}${rest}`;
  }

  return iso;
}

function extractJson(content: string) {
  // In case of wrapping
  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace >= 0 && lastBrace > firstBrace) {
    return content.slice(firstBrace, lastBrace + 1);
  }
  return content;
}

export async function parseSyllabusAction(formData: FormData) {
  const syllabusText = String(formData.get("syllabus") || "").trim();
  if (!syllabusText) {
    return { ok: false as const, error: "Paste your syllabus first." };
  }

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (!apiKey) {
    return {
      ok: false as const,
      error: "Missing OPENAI_API_KEY on the server.",
    };
  }

  const system =
    "You are a parser. Return ONLY valid JSON that matches the requested schema. " +
    "Dates must be ISO-8601 strings. If only a day is known, use YYYY-MM-DD. " +
    `Today is ${todayIso}. If the syllabus does not specify a year, assume the current year. ` +
    "The summary MUST equal the counts of events by type (do not guess). " +
    "IMPORTANT: If a course code is mentioned (e.g., CP312, CS101, MATH201), prefix EVERY title with it like 'CP312 - Quiz 1'. " +
    "Always extract and include the course code in titles when available.";

  const user =
    "Parse this syllabus into JSON with shape: " +
    '{"summary":{"quizzes":0,"assignments":0,"exams":0},"events":[{"title":"...","type":"quiz|assignment|exam","date":"YYYY-MM-DD or ISO datetime","description":"..."}]}.\n' +
    `Rules: summary counts must be derived from events; if there are no quizzes, quizzes must be 0. Today is ${todayIso}.\n` +
    `If a course code is found (like CP312, CS101, etc.), prefix each title with it, e.g., "CP312 - Assignment 2".\n\n` +
    `SYLLABUS:\n${syllabusText}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      ok: false as const,
      error: `LLM request failed (${res.status}). ${text}`,
    };
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return { ok: false as const, error: "LLM returned empty output." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(content));
  } catch {
    return { ok: false as const, error: "LLM returned invalid JSON." };
  }

  const validated = ParsedSyllabusSchema.safeParse(parsed);
  if (!validated.success) {
    return {
      ok: false as const,
      error: "Parsed JSON did not match schema.",
    };
  }

  // Ensure confirmed summary matches parsed event
  const normalizedEvents = validated.data.events.map((e) => ({
    ...e,
    date: normalizeLikelyWrongYear(e.date, now),
  }));

  const computedSummary = normalizedEvents.reduce(
    (acc, e) => {
      if (e.type === "quiz") acc.quizzes += 1;
      else if (e.type === "assignment") acc.assignments += 1;
      else if (e.type === "exam") acc.exams += 1;
      return acc;
    },
    { quizzes: 0, assignments: 0, exams: 0 },
  );

  return {
    ok: true as const,
    data: {
      ...validated.data,
      events: normalizedEvents,
      summary: computedSummary,
    },
  };
}
