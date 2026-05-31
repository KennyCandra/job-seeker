import { z } from "zod";

const filterField = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (typeof v === "string" ? [v] : v), schema);

export const filterSchema = z.object({
  verdict: z.preprocess(
    (v) => (typeof v === "string" ? v.toLowerCase() : v),
    z.enum(["accept", "reject"]),
  ),
  score: z.preprocess(
    (v) => (typeof v === "string" ? Number(v) : v),
    z.number(),
  ),
  reasons: filterField(z.array(z.string())),
  must_have_hits: filterField(z.array(z.string())).default([]),
  missing: filterField(z.array(z.string())),
});

function readKey(obj: Record<string, unknown>, key: string) {
  return obj[key] ?? obj[key.toLowerCase()];
}

function normalizeKeys(raw: Record<string, unknown>) {
  return {
    verdict: readKey(raw, "Verdict"),
    score: readKey(raw, "Score"),
    reasons: readKey(raw, "Reasons"),
    must_have_hits: readKey(raw, "Must-have hits"),
    missing: readKey(raw, "Missing"),
  };
}

export function safeParseFilter(raw: unknown) {
  const direct = filterSchema.safeParse(raw);
  if (direct.success) return direct;

  const normalized = normalizeKeys(raw as Record<string, unknown>);
  return filterSchema.safeParse(normalized);
}
