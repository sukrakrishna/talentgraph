import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ROLES, ROLE_SKILLS } from "@/data/roles";
import { SKILLS_BY_ID } from "@/data/skills";
import { scoreEmployeeForRole } from "@/lib/scoring";

const VerifySchema = {
  confirmed: "confirmed",
  notAccurate: "not_accurate",
} as const;

type VerifyAction = (typeof VerifySchema)[keyof typeof VerifySchema];

async function roleScores(employeeId: string) {
  const { data: skillRows, error } = await supabaseAdmin
    .from("employee_skills")
    .select("skill_id")
    .eq("employee_id", employeeId);
  if (error) throw new Error(error.message);
  const skillIds = new Set((skillRows ?? []).map((row) => row.skill_id));
  return ROLES.map((role) => {
    const breakdown = scoreEmployeeForRole(
      skillIds,
      ROLE_SKILLS.filter((skill) => skill.role_id === role.id)
    );
    return { roleId: role.id, title: role.title, score: breakdown.score };
  });
}

export async function GET(request: Request) {
  const employeeId = new URL(request.url).searchParams.get("employeeId");
  let query = supabaseAdmin
    .from("audit_logs")
    .select("id, employee_id, action, skill_id, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (employeeId) query = query.eq("employee_id", employeeId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    logs: (data ?? []).map((log) => ({ ...log, skillName: SKILLS_BY_ID.get(log.skill_id)?.name ?? log.skill_id })),
  });
}

export async function POST(request: Request) {
  let body: { employeeId?: string; skillId?: string; action?: VerifyAction };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }
  if (!body.employeeId || !body.skillId || !body.action || !Object.values(VerifySchema).includes(body.action)) {
    return NextResponse.json({ error: "employeeId, skillId, and a valid action are required" }, { status: 400 });
  }

  const { data: skillRow, error: skillError } = await supabaseAdmin
    .from("employee_skills")
    .select("employee_id, skill_id, source, evidence, proficiency, linked_to")
    .eq("employee_id", body.employeeId)
    .eq("skill_id", body.skillId)
    .maybeSingle();
  if (skillError) return NextResponse.json({ error: skillError.message }, { status: 500 });
  if (!skillRow) return NextResponse.json({ error: "Skill was not found for this employee" }, { status: 404 });

  const write = body.action === "confirmed"
    ? await supabaseAdmin.from("employee_skills").upsert(skillRow)
    : await supabaseAdmin.from("employee_skills").delete().eq("employee_id", body.employeeId).eq("skill_id", body.skillId);
  if (write.error) return NextResponse.json({ error: write.error.message }, { status: 500 });

  const audit = await supabaseAdmin.from("audit_logs").insert({
    employee_id: body.employeeId,
    action: body.action,
    skill_id: body.skillId,
  });
  if (audit.error) return NextResponse.json({ error: audit.error.message }, { status: 500 });

  try {
    return NextResponse.json({ action: body.action, roleScores: await roleScores(body.employeeId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
