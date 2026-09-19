import { createClient } from "@supabase/supabase-js";
import { SKILLS } from "@/data/skills";
import { ROLES, ROLE_SKILLS } from "@/data/roles";
import { COURSES } from "@/data/courses";
import { EMPLOYEES, EMPLOYEE_SKILLS } from "@/data/employees";
import { slugify } from "@/lib/slugify";
import { scoreEmployeeForRole } from "@/lib/scoring";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function upsertBatched<T extends object>(
  table: string,
  rows: T[],
  onConflict: string,
  batchSize = 500
) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    // `db` is an untyped SupabaseClient (this script seeds arbitrary tables), so
    // supabase-js's generic row-shape inference can't resolve here — cast past it.
    const { error } = await db.from(table).upsert(batch as never, { onConflict });
    if (error) {
      throw new Error(`Upsert into "${table}" failed: ${error.message}`);
    }
  }
  console.log(`  ${table}: upserted ${rows.length} rows`);
}

async function main() {
  console.log(`Seeding ${supabaseUrl} ...\n`);

  console.log("Skills, employees, roles, courses:");
  await upsertBatched("skills", SKILLS.map((s) => ({ id: slugify(s.name), ...s })), "id");
  await upsertBatched("employees", EMPLOYEES, "id");
  await upsertBatched("roles", ROLES.map(({ id, title, team, description }) => ({ id, title, team, description })), "id");
  await upsertBatched("courses", COURSES, "id");

  console.log("\nJoin tables:");
  await upsertBatched("employee_skills", EMPLOYEE_SKILLS, "employee_id,skill_id");
  await upsertBatched("role_skills", ROLE_SKILLS, "role_id,skill_id");

  console.log("\nDemo check — Ravi K. vs. Data Analyst:");
  const raviSkillIds = new Set(
    EMPLOYEE_SKILLS.filter((s) => s.employee_id === "ravi-k").map((s) => s.skill_id)
  );
  const dataAnalystSkills = ROLE_SKILLS.filter((rs) => rs.role_id === "data-analyst");
  const baseline = scoreEmployeeForRole(raviSkillIds, dataAnalystSkills);
  console.log(
    `  baseline: ${baseline.score}% (required ${baseline.requiredCovered}/${baseline.requiredTotal}, preferred ${baseline.preferredCovered}/${baseline.preferredTotal})`
  );
  console.log(`  missing required: ${baseline.missingRequired.join(", ")}`);
  console.log(`  missing preferred: ${baseline.missingPreferred.join(", ")}`);

  const withStats = scoreEmployeeForRole(new Set([...raviSkillIds, "statistics"]), dataAnalystSkills);
  const withPython = scoreEmployeeForRole(new Set([...raviSkillIds, "python"]), dataAnalystSkills);
  const withBoth = scoreEmployeeForRole(new Set([...raviSkillIds, "statistics", "python"]), dataAnalystSkills);
  console.log(
    `  + "Statistics for Analysts"  -> ${withStats.score}% (${withStats.score - baseline.score >= 0 ? "+" : ""}${withStats.score - baseline.score})`
  );
  console.log(
    `  + "Python for Data Analysis" -> ${withPython.score}% (${withPython.score - baseline.score >= 0 ? "+" : ""}${withPython.score - baseline.score})`
  );
  console.log(
    `  + both courses                -> ${withBoth.score}% (${withBoth.score - baseline.score >= 0 ? "+" : ""}${withBoth.score - baseline.score} combined)`
  );

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
