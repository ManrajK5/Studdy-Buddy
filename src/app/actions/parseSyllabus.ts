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

function extractJson(content: string) {
  // Tolerate accidental wrapping.
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
    "Dates must be ISO-8601 strings. If only a day is known, use YYYY-MM-DD.";

  const user =
    "Parse this syllabus into JSON with shape: " +
    '{"summary":{"quizzes":3,"assignments":5,"exams":2},"events":[{"title":"...","type":"quiz|assignment|exam","date":"YYYY-MM-DD or ISO datetime","description":"..."}]}.\n\n' +
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

  return { ok: true as const, data: validated.data };
}
