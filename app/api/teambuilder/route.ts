import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJson } from "@/lib/llm";
import { EMPLOYEES, EMPLOYEE_SKILLS } from "@/data/employees";
import { SKILLS_BY_ID } from "@/data/skills";
import { guardText, SECURITY_GUARDRAIL_MESSAGE } from "@/lib/guardrails";

const AVG_EXTERNAL_SALARY_LAKHS = 8;
const AGENCY_FEE_PERCENT = 20;

const RequestSchema = z.object({ brief: z.string().trim().min(3).max(1000) });
const SkillMappingSchema = z.object({
  requiredSkillIds: z.array(z.string()).max(12),
});

function buildPrompt() {
  const taxonomy = [...SKILLS_BY_ID.values()]
    .map((skill) => `${skill.id}: ${skill.name} (${skill.category})`)
    .join("\n");
  return `You map an internal team brief to the smallest useful set of required skill IDs from a fixed taxonomy. Return only skills genuinely needed by the brief, usually 4 to 10. Copy IDs exactly from the taxonomy.\n\nTaxonomy:\n${taxonomy}`;
}

function fallbackSkillIds(brief: string): string[] {
  const normalized = brief.toLowerCase();
  return [...SKILLS_BY_ID.values()]
    .filter((skill) => normalized.includes(skill.name.toLowerCase()) || normalized.includes(skill.id))
    .map((skill) => skill.id)
    .slice(0, 10);
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
    return NextResponse.json({ error: "brief must be a non-empty string" }, { status: 400 });
  }

  const guardedBrief = guardText(parsed.data.brief);
  if (!guardedBrief.safe) {
    return NextResponse.json({ error: SECURITY_GUARDRAIL_MESSAGE, safe: false }, { status: 400 });
  }

  let requiredSkillIds: string[];
  try {
    const mapping = await generateJson(SkillMappingSchema, buildPrompt(), { brief: guardedBrief.text });
    requiredSkillIds = mapping.requiredSkillIds;
  } catch {
    requiredSkillIds = fallbackSkillIds(guardedBrief.text);
  }

  const validSkillIds = [...new Set(requiredSkillIds)].filter((skillId) => SKILLS_BY_ID.has(skillId));
  const requiredSkills = validSkillIds.map((skillId) => ({
    id: skillId,
    name: SKILLS_BY_ID.get(skillId)?.name ?? skillId,
  }));
  const skillsByEmployee = new Map<string, Set<string>>();
  for (const skill of EMPLOYEE_SKILLS) {
    const skills = skillsByEmployee.get(skill.employee_id) ?? new Set<string>();
    skills.add(skill.skill_id);
    skillsByEmployee.set(skill.employee_id, skills);
  }

  const remaining = new Set(validSkillIds);
  const selectedIds = new Set<string>();
  const members: {
    id: string;
    name: string;
    jobTitle: string;
    department: string;
    matchedSkills: { id: string; name: string }[];
  }[] = [];

  for (let pick = 0; pick < 3; pick++) {
    const candidate = EMPLOYEES.filter((employee) => !selectedIds.has(employee.id))
      .map((employee) => {
        const employeeSkills = skillsByEmployee.get(employee.id) ?? new Set<string>();
        const covers = validSkillIds.filter((skillId) => remaining.has(skillId) && employeeSkills.has(skillId));
        return { employee, employeeSkills, covers };
      })
      .sort((a, b) => b.covers.length - a.covers.length)[0];

    if (!candidate) break;
    selectedIds.add(candidate.employee.id);
    candidate.covers.forEach((skillId) => remaining.delete(skillId));
    members.push({
      id: candidate.employee.id,
      name: candidate.employee.name,
      jobTitle: candidate.employee.job_title,
      department: candidate.employee.department,
      matchedSkills: validSkillIds
        .filter((skillId) => candidate.employeeSkills.has(skillId))
        .map((skillId) => ({ id: skillId, name: SKILLS_BY_ID.get(skillId)?.name ?? skillId })),
    });
  }

  const coveredSkillIds = new Set(members.flatMap((member) => member.matchedSkills.map((skill) => skill.id)));
  const missingSkills = requiredSkills.filter((skill) => !coveredSkillIds.has(skill.id));

  return NextResponse.json({
    brief: guardedBrief.text,
    requiredSkills,
    members,
    coverage: { covered: coveredSkillIds.size, total: requiredSkills.length },
    missingSkills,
    costAvoidedLakhs: members.length * AVG_EXTERNAL_SALARY_LAKHS * (AGENCY_FEE_PERCENT / 100),
    assumptions: { avgExternalSalaryLakhs: AVG_EXTERNAL_SALARY_LAKHS, agencyFeePercent: AGENCY_FEE_PERCENT },
  });
}
