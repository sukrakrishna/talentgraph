import { NextResponse } from "next/server";
import { z } from "zod";
import { EMPLOYEES } from "@/data/employees";
import { ROLES, ROLE_SKILLS } from "@/data/roles";
import { SKILLS_BY_ID } from "@/data/skills";
import { scoreEmployeeForRole } from "@/lib/scoring";
import { generateJson } from "@/lib/llm";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { guardText, SECURITY_GUARDRAIL_MESSAGE } from "@/lib/guardrails";

const RequestSchema = z.object({ employeeId: z.string().min(1), roleId: z.string().min(1) });
const PitchSchema = z.object({ paragraphs: z.array(z.string().min(1).max(900)).length(3) });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "employeeId and roleId are required" }, { status: 400 });

  const employee = EMPLOYEES.find((item) => item.id === parsed.data.employeeId);
  const role = ROLES.find((item) => item.id === parsed.data.roleId);
  if (!employee || !role) return NextResponse.json({ error: "Employee or role not found" }, { status: 404 });

  const [{ data: skillRows, error }, { data: employeeRow, error: employeeError }] = await Promise.all([
    supabaseAdmin.from("employee_skills").select("skill_id").eq("employee_id", employee.id),
    supabaseAdmin.from("employees").select("name, job_title, department, bio").eq("id", employee.id).maybeSingle(),
  ]);
  if (error || employeeError) return NextResponse.json({ error: error?.message ?? employeeError?.message }, { status: 500 });

  const employeeSkills = new Set((skillRows ?? []).map((skill) => skill.skill_id));
  const roleSkills = ROLE_SKILLS.filter((skill) => skill.role_id === role.id);
  const breakdown = scoreEmployeeForRole(employeeSkills, roleSkills);
  const matchedSkills = roleSkills.filter((skill) => employeeSkills.has(skill.skill_id)).map((skill) => SKILLS_BY_ID.get(skill.skill_id)?.name ?? skill.skill_id);
  const missingSkills = [...breakdown.missingRequired, ...breakdown.missingPreferred].map((skillId) => SKILLS_BY_ID.get(skillId)?.name ?? skillId);
  const safeBio = guardText(employeeRow?.bio ?? employee.bio);
  if (!safeBio.safe) return NextResponse.json({ error: SECURITY_GUARDRAIL_MESSAGE, safe: false }, { status: 400 });

  try {
    const result = await generateJson(PitchSchema, `Write a tailored three-paragraph internal mobility transfer pitch for an employee applying to a role. Use ONLY the supplied profile, matched skills, match score, and missing skill gaps. Paragraph 1: motivation and relevant evidence. Paragraph 2: matched capabilities and concrete value. Paragraph 3: acknowledge gaps and give a practical bridge plan. Do not invent experience, achievements, dates, or qualifications. Return exactly three polished paragraphs.`, {
      employee: { name: employee.name, jobTitle: employee.job_title, department: employee.department, bio: safeBio.text },
      role: { title: role.title, department: role.department, description: role.description },
      match: { score: breakdown.score, matchedSkills, missingSkills },
    });
    return NextResponse.json({ employee: employee.name, role: role.title, score: breakdown.score, paragraphs: result.paragraphs });
  } catch {
    return NextResponse.json({
      employee: employee.name,
      role: role.title,
      score: breakdown.score,
      paragraphs: [
        `I am excited to explore the ${role.title} opportunity because my experience as a ${employee.job_title} has built a strong foundation for this move.`,
        `My current match is ${breakdown.score}%, supported by ${matchedSkills.slice(0, 5).join(", ") || "relevant transferable skills"}. I can bring that capability to the ${role.department} team from day one.`,
        `I am actively closing the remaining gaps in ${missingSkills.join(", ") || "the role requirements"} through focused practice and portfolio evidence, and would welcome the opportunity to grow into the role.`,
      ],
    });
  }
}
