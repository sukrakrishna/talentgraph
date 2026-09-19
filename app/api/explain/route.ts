import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJson } from "@/lib/llm";

const EXPLAIN_TIMEOUT_MS = 8000;
const MAX_ROLES = 5;

const RoleInputSchema = z.object({
  role_id: z.string(),
  title: z.string(),
  score: z.number(),
  matchedSkills: z.array(z.string()),
  missingRequiredSkills: z.array(z.string()),
  missingPreferredSkills: z.array(z.string()),
  requiredCovered: z.number(),
  requiredTotal: z.number(),
});
type RoleInput = z.infer<typeof RoleInputSchema>;

const RequestSchema = z.object({
  roles: z.array(RoleInputSchema).min(1),
});

const ExplainSchema = z.object({
  explanations: z.array(
    z.object({
      role_id: z.string().describe("Copied exactly from one of the input role_id values"),
      sentence: z
        .string()
        .describe("One short, concrete sentence (max ~20 words) explaining the fit"),
    })
  ),
});

function buildPrompt(): string {
  return `You are writing short explanations of how well an employee's skills match each job role, for an internal talent-matching tool.

For each role in the input, write exactly one short, concrete sentence (max 20 words) explaining the fit. Mention specific matched skills that support the fit and/or specific missing skills that hold it back — pick whichever is more informative given the score. Do not restate the score or role title verbatim; focus on the skills.

Return one entry per role, with "role_id" copied exactly from the input and "sentence" holding your explanation, in the same order as the input roles.`;
}

/** Formats a skill list as "A", "A and B", or "A, B, and C". */
function formatList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function fallbackSentence(role: RoleInput): string {
  const base = `Matches ${role.requiredCovered} of ${role.requiredTotal} required skills`;
  const missing = role.missingRequiredSkills.length > 0
    ? role.missingRequiredSkills
    : role.missingPreferredSkills;
  return missing.length > 0 ? `${base}; missing ${formatList(missing)}.` : `${base}.`;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Explanation timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "roles is required" }, { status: 400 });
  }

  const topRoles = parsed.data.roles.slice(0, MAX_ROLES);

  let sentenceByRoleId = new Map<string, string>();
  try {
    const result = await withTimeout(
      generateJson(ExplainSchema, buildPrompt(), { roles: topRoles }),
      EXPLAIN_TIMEOUT_MS
    );
    sentenceByRoleId = new Map(result.explanations.map((e) => [e.role_id, e.sentence]));
  } catch {
    // Fall through to the plain fallback below for every role.
  }

  const explanations = topRoles.map((role) => ({
    role_id: role.role_id,
    sentence: sentenceByRoleId.get(role.role_id) ?? fallbackSentence(role),
  }));

  return NextResponse.json({ explanations });
}
