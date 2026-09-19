import { NextResponse } from "next/server";
import { z } from "zod";
import { ROLES, ROLE_SKILLS } from "@/data/roles";
import { SKILLS_BY_ID } from "@/data/skills";
import { scoreEmployeeForRole } from "@/lib/scoring";
import { generateJsonWithMeta } from "@/lib/llm";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { guardText, SECURITY_GUARDRAIL_MESSAGE } from "@/lib/guardrails";

const DEFAULT_EMPLOYEE_ID = "ravi-k";
const RequestSchema = z.object({
  message: z.string().trim().min(1).max(1200),
  employeeId: z.string().trim().min(1).default(DEFAULT_EMPLOYEE_ID),
});
const AssistantResponseSchema = z.object({
  inScope: z.boolean(),
  answer: z.string().min(1).max(1600),
});

type RoleContext = {
  id: string;
  title: string;
  department: string;
  score: number;
  requiredCovered: number;
  requiredTotal: number;
  preferredCovered: number;
  preferredTotal: number;
  missingRequired: string[];
  missingPreferred: string[];
};

type AssistantContext = {
  employee: { id: string; name: string; jobTitle: string; department: string; bio: string };
  skills: { id: string; name: string; source: string; proficiency: number; evidence: string }[];
  roles: RoleContext[];
};

function skillName(skillId: string): string {
  return SKILLS_BY_ID.get(skillId)?.name ?? skillId;
}

function buildContext(
  employee: { id: string; name: string; job_title: string; department: string; bio: string },
  skillRows: { skill_id: string; source: string; proficiency: number; evidence: string }[]
): AssistantContext {
  const employeeSkillIds = new Set(skillRows.map((skill) => skill.skill_id));
  const roles = ROLES.map((role) => {
    const roleSkills = ROLE_SKILLS.filter((skill) => skill.role_id === role.id);
    const breakdown = scoreEmployeeForRole(employeeSkillIds, roleSkills);
    return {
      id: role.id,
      title: role.title,
      department: role.department,
      score: breakdown.score,
      requiredCovered: breakdown.requiredCovered,
      requiredTotal: breakdown.requiredTotal,
      preferredCovered: breakdown.preferredCovered,
      preferredTotal: breakdown.preferredTotal,
      missingRequired: breakdown.missingRequired.map(skillName),
      missingPreferred: breakdown.missingPreferred.map(skillName),
    };
  }).sort((a, b) => b.score - a.score);

  return {
    employee: {
      id: employee.id,
      name: employee.name,
      jobTitle: employee.job_title,
      department: employee.department,
      bio: employee.bio,
    },
    skills: skillRows.map((skill) => ({
      id: skill.skill_id,
      name: skillName(skill.skill_id),
      source: skill.source,
      proficiency: skill.proficiency,
      evidence: skill.evidence,
    })),
    roles,
  };
}

function buildPrompt(context: AssistantContext): string {
  return `You are TalentGraph Assistant, a grounded career mobility assistant. Answer the user's question using ONLY the employee context below: profile, explicit or inferred skills, role requirements, match scores, and missing skill gaps.

If the question is about general trivia, unrelated coding help, programming instructions outside the listed skill gaps, another person, or anything not answerable from this context, set inScope to false and answer exactly: "I can only answer questions about this employee's talent graph, career mobility, and skill gaps."

For an in-scope question, set inScope to true and answer concisely with concrete names and percentages from the context. Never invent skills, evidence, scores, job history, salary, timelines, or recommendations that are not supported by the context. When discussing a role, distinguish required and preferred gaps. Return only JSON matching the requested schema.

Employee context:
${JSON.stringify(context, null, 2)}`;
}

function isLikelyOutOfScope(message: string): boolean {
  const normalized = message.toLowerCase();
  const contextTerms = [
    "skill", "role", "match", "score", "gap", "career", "mobility", "employee", "profile",
    "missing", "best suited", "improve", "data analyst", "support engineer", "job", "talent",
  ];
  return !contextTerms.some((term) => normalized.includes(term));
}

function fallbackAnswer(message: string, context: AssistantContext): { inScope: boolean; answer: string } {
  if (isLikelyOutOfScope(message)) {
    return {
      inScope: false,
      answer: "I can only answer questions about this employee's talent graph, career mobility, and skill gaps.",
    };
  }

  const dataAnalyst = context.roles.find((role) => role.id === "data-analyst");
  if (dataAnalyst && message.toLowerCase().includes("data analyst")) {
    return {
      inScope: true,
      answer: `${context.employee.name} is a ${dataAnalyst.score}% match for Data Analyst: ${dataAnalyst.requiredCovered}/${dataAnalyst.requiredTotal} required and ${dataAnalyst.preferredCovered}/${dataAnalyst.preferredTotal} preferred skills covered. The gaps are ${[...dataAnalyst.missingRequired, ...dataAnalyst.missingPreferred].join(", ")}.`,
    };
  }

  const topRoles = context.roles.slice(0, 3).map((role) => `${role.title} (${role.score}%)`).join(", ");
  return { inScope: true, answer: `Based on the current talent graph, the strongest role matches are ${topRoles}. I can also explain a specific role's score or missing skills.` };
}

export async function POST(request: Request) {
  const startedAt = performance.now();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const guardedMessage = guardText(parsed.data.message);
  if (!guardedMessage.safe) {
    return NextResponse.json({ error: SECURITY_GUARDRAIL_MESSAGE, safe: false }, { status: 400 });
  }

  const [{ data: employee, error: employeeError }, { data: skillRows, error: skillsError }] = await Promise.all([
    supabaseAdmin
      .from("employees")
      .select("id, name, job_title, department, bio")
      .eq("id", parsed.data.employeeId)
      .maybeSingle(),
    supabaseAdmin
      .from("employee_skills")
      .select("skill_id, source, proficiency, evidence")
      .eq("employee_id", parsed.data.employeeId),
  ]);

  if (employeeError || skillsError) {
    return NextResponse.json({ error: employeeError?.message ?? skillsError?.message }, { status: 500 });
  }
  if (!employee) {
    return NextResponse.json({ error: `No employee with id "${parsed.data.employeeId}"` }, { status: 404 });
  }

  const context = buildContext(
    employee,
    (skillRows ?? []).map((skill) => ({ ...skill, evidence: skill.evidence ?? "" }))
  );
  let response: { inScope: boolean; answer: string };
  let cacheHit = false;
  try {
    const generated = await generateJsonWithMeta(
      AssistantResponseSchema,
      buildPrompt(context),
      { message: guardedMessage.text }
    );
    response = generated.data;
    cacheHit = generated.cacheHit;
  } catch {
    response = fallbackAnswer(guardedMessage.text, context);
  }

  if (!response.inScope) {
    response.answer = "I can only answer questions about this employee's talent graph, career mobility, and skill gaps.";
  }

  return NextResponse.json({
    ...response,
    cacheHit,
    latencyMs: Math.round(performance.now() - startedAt),
    employee: {
      id: context.employee.id,
      name: context.employee.name,
      jobTitle: context.employee.jobTitle,
      department: context.employee.department,
    },
  });
}
