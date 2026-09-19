import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { SKILLS_BY_ID } from "@/data/skills";
import { ROLES, ROLE_SKILLS } from "@/data/roles";
import { scoreEmployeeForRole } from "@/lib/scoring";

function skillName(id: string): string {
  return SKILLS_BY_ID.get(id)?.name ?? id;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  if (!employeeId) {
    return NextResponse.json({ error: "employeeId query parameter is required" }, { status: 400 });
  }

  const [{ data: employee, error: employeeError }, { data: skillRows, error: skillsError }] =
    await Promise.all([
      supabaseAdmin.from("employees").select("id").eq("id", employeeId).maybeSingle(),
      supabaseAdmin.from("employee_skills").select("skill_id").eq("employee_id", employeeId),
    ]);

  if (employeeError) {
    return NextResponse.json({ error: employeeError.message }, { status: 500 });
  }
  if (!employee) {
    return NextResponse.json({ error: `No employee with id "${employeeId}"` }, { status: 404 });
  }
  if (skillsError) {
    return NextResponse.json({ error: skillsError.message }, { status: 500 });
  }

  const employeeSkillIds = new Set((skillRows ?? []).map((row) => row.skill_id));

  const roles = ROLES.map((role) => {
    const roleSkills = ROLE_SKILLS.filter((rs) => rs.role_id === role.id);
    const breakdown = scoreEmployeeForRole(employeeSkillIds, roleSkills);
    const matchedSkills = roleSkills
      .filter((rs) => employeeSkillIds.has(rs.skill_id))
      .map((rs) => skillName(rs.skill_id));

    return {
      role_id: role.id,
      title: role.title,
      team: role.team,
      department: role.department,
      score: breakdown.score,
      requiredCovered: breakdown.requiredCovered,
      requiredTotal: breakdown.requiredTotal,
      preferredCovered: breakdown.preferredCovered,
      preferredTotal: breakdown.preferredTotal,
      matchedSkills,
      missingRequiredSkills: breakdown.missingRequired.map(skillName),
      missingPreferredSkills: breakdown.missingPreferred.map(skillName),
    };
  });

  roles.sort((a, b) => b.score - a.score);

  return NextResponse.json({ roles });
}
