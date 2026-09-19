import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { SKILLS_BY_ID } from "@/data/skills";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [{ data: employee, error: employeeError }, { data: skillRows, error: skillsError }] =
    await Promise.all([
      supabaseAdmin.from("employees").select("*").eq("id", id).maybeSingle(),
      supabaseAdmin.from("employee_skills").select("*").eq("employee_id", id),
    ]);

  if (employeeError) {
    return NextResponse.json({ error: employeeError.message }, { status: 500 });
  }
  if (!employee) {
    return NextResponse.json({ error: `No employee with id "${id}"` }, { status: 404 });
  }
  if (skillsError) {
    return NextResponse.json({ error: skillsError.message }, { status: 500 });
  }

  const skills = (skillRows ?? []).map((row) => {
    const def = SKILLS_BY_ID.get(row.skill_id);
    return {
      skill_id: row.skill_id,
      name: def?.name ?? row.skill_id,
      category: def?.category ?? "Other",
      source: row.source,
      evidence: row.evidence,
      proficiency: row.proficiency,
      linked_to: row.linked_to,
    };
  });

  return NextResponse.json({ employee, skills });
}
