import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJson } from "@/lib/llm";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { SKILLS, SKILLS_BY_ID, skillId } from "@/data/skills";
import { RAVI } from "@/data/employees";

const ExtractionSchema = z.object({
  skills: z
    .array(
      z.object({
        skill: z.string().describe("The exact skill name, copied from the taxonomy list"),
        source: z.enum(["explicit", "inferred"]),
        evidence: z
          .string()
          .describe("A short phrase copied verbatim (exact substring) from the bio"),
        proficiency: z.number().int().min(1).max(3),
        linked_to: z
          .array(z.string())
          .describe(
            "For inferred skills, the other extracted skill names this was inferred from. Empty for explicit skills."
          ),
      })
    )
    .max(30),
});

function buildPrompt(): string {
  const taxonomy = SKILLS.map((s) => s.name).join(", ");
  return `You are extracting workplace skills from an employee's bio for an internal talent-matching tool.

Only use skill names from this exact taxonomy (copy each name exactly as written below):
${taxonomy}

For every skill you identify, output one entry with:
- skill: the exact taxonomy name (must match one of the names above, verbatim)
- source: "explicit" if the bio directly states the employee does or did this, or "inferred" if it is a reasonable skill implied by the bio but not stated outright
- evidence: a short phrase copied VERBATIM (an exact, character-for-character substring) from the bio that supports this skill — required for both explicit and inferred skills
- proficiency: an integer 1-3 (1 = some exposure, 2 = solid working knowledge, 3 = strong/demonstrated expertise) based on how the bio describes it
- linked_to: for inferred skills, an array of the other extracted skill names (from your own output, exact taxonomy names) that this one was inferred from. Empty array for explicit skills.

If source is "explicit", the taxonomy name you choose must have its own words appear in the evidence quote (e.g. evidence containing "SQL reports" can support the skill "SQL", but not a skill like "Business Reporting" whose words don't appear in that quote).

Extract between 4 and 12 skills total. Do not invent skills outside the taxonomy above. Do not repeat the same skill twice.`;
}

type ValidatedSkill = {
  skill_id: string;
  source: "explicit" | "inferred";
  evidence: string;
  proficiency: number;
  linked_to: string[];
};

/** trims, collapses internal whitespace, and lowercases — used for lenient bio/evidence comparisons. */
function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function toResponseSkill(s: {
  skill_id: string;
  source: string;
  evidence: string | null;
  proficiency: number;
  linked_to: string[] | null;
}) {
  const def = SKILLS_BY_ID.get(s.skill_id);
  return {
    skill_id: s.skill_id,
    name: def?.name ?? s.skill_id,
    category: def?.category ?? "Other",
    source: s.source,
    evidence: s.evidence ?? "",
    proficiency: s.proficiency,
    linked_to: s.linked_to ?? [],
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }

  const parsed = z
    .object({ employeeId: z.string().min(1), bio: z.string().min(1) })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "employeeId and bio are required" },
      { status: 400 }
    );
  }
  const { employeeId, bio } = parsed.data;

  const { data: employee, error: employeeError } = await supabaseAdmin
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .maybeSingle();
  if (employeeError) {
    return NextResponse.json({ error: employeeError.message }, { status: 500 });
  }
  if (!employee) {
    return NextResponse.json({ error: `No employee with id "${employeeId}"` }, { status: 404 });
  }

  // If this is Ravi's known demo bio (allowing for trivial formatting differences),
  // skip the LLM entirely and serve his already-verified skills straight from the DB.
  if (normalize(bio) === normalize(RAVI.bio)) {
    const { data: raviSkillRows, error: raviSkillsError } = await supabaseAdmin
      .from("employee_skills")
      .select("*")
      .eq("employee_id", RAVI.id);
    if (raviSkillsError) {
      return NextResponse.json({ error: raviSkillsError.message }, { status: 500 });
    }
    return NextResponse.json({ skills: (raviSkillRows ?? []).map(toResponseSkill) });
  }

  let extraction: z.infer<typeof ExtractionSchema>;
  try {
    extraction = await generateJson(ExtractionSchema, buildPrompt(), { bio });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Skill extraction failed: ${message}` }, { status: 502 });
  }

  // Enforce the same rule the seeded demo data follows: evidence must appear in the
  // bio (case-insensitive, whitespace-normalized), and the skill name must resolve
  // to a known taxonomy id.
  const normalizedBio = normalize(bio);
  const byId = new Map<string, ValidatedSkill>();
  for (const raw of extraction.skills) {
    if (!normalizedBio.includes(normalize(raw.evidence))) continue;
    let id: string;
    try {
      id = skillId(raw.skill);
    } catch {
      continue;
    }
    if (byId.has(id)) continue;
    byId.set(id, {
      skill_id: id,
      source: raw.source,
      evidence: raw.evidence,
      proficiency: raw.proficiency,
      linked_to: raw.linked_to,
    });
  }

  if (byId.size === 0) {
    return NextResponse.json(
      { error: "No verifiable skills were found in that bio. Try adding more concrete detail." },
      { status: 422 }
    );
  }

  const validated = [...byId.values()].map((s) => ({
    ...s,
    linked_to: s.linked_to
      .map((name) => {
        try {
          return skillId(name);
        } catch {
          return null;
        }
      })
      .filter((id): id is string => id !== null && byId.has(id) && id !== s.skill_id),
  }));

  return NextResponse.json({ skills: validated.map(toResponseSkill) });
}
