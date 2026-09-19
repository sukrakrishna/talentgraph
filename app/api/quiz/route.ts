import { NextResponse } from "next/server";
import { z } from "zod";
import { ROLES, ROLE_SKILLS } from "@/data/roles";
import { SKILLS_BY_ID } from "@/data/skills";
import { scoreEmployeeForRole } from "@/lib/scoring";
import { generateJson } from "@/lib/llm";
import { supabaseAdmin } from "@/lib/supabase-admin";

const QuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()).length(4),
});
const QuizSchema = z.object({ questions: z.array(QuestionSchema).length(3) });
const EvaluationSchema = z.object({ score: z.number().min(0).max(100), feedback: z.string().min(1).max(800) });
const RequestSchema = z.object({
  action: z.enum(["generate", "evaluate"]),
  employeeId: z.string().min(1),
  skillId: z.string().min(1),
  questions: z.array(QuestionSchema).optional(),
  answers: z.record(z.string(), z.string()).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 }); }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid quiz request" }, { status: 400 });
  const { employeeId, skillId, action } = parsed.data;
  const skill = SKILLS_BY_ID.get(skillId);
  if (!skill) return NextResponse.json({ error: "Unknown skill" }, { status: 404 });

  if (action === "generate") {
    try {
      const result = await generateJson(QuizSchema, `Create exactly three concise multiple-choice questions to verify practical understanding of the skill "${skill.name}" in an internal workplace context. Each question must have exactly four answer options. Do not include answers in the response.`, { skill: { id: skill.id, name: skill.name, category: skill.category } });
      return NextResponse.json({ skill: { id: skill.id, name: skill.name }, questions: result.questions });
    } catch {
      return NextResponse.json({ error: "Quiz generation failed" }, { status: 502 });
    }
  }

  if (!parsed.data.questions || !parsed.data.answers) return NextResponse.json({ error: "Questions and answers are required" }, { status: 400 });
  const [{ data: employee, error: employeeError }, { data: skillRows, error: skillError }] = await Promise.all([
    supabaseAdmin.from("employees").select("id, name").eq("id", employeeId).maybeSingle(),
    supabaseAdmin.from("employee_skills").select("skill_id").eq("employee_id", employeeId),
  ]);
  if (employeeError || skillError) return NextResponse.json({ error: employeeError?.message ?? skillError?.message }, { status: 500 });
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  let evaluation: z.infer<typeof EvaluationSchema>;
  try {
    evaluation = await generateJson(EvaluationSchema, `Evaluate the employee's answers to a three-question skill verification quiz. Score based only on the questions, options, and selected answers supplied. Give a short constructive feedback sentence. A score of 80 or higher verifies the skill.`, {
      skill: { id: skill.id, name: skill.name },
      questions: parsed.data.questions,
      selectedAnswers: parsed.data.answers,
    });
  } catch {
    return NextResponse.json({ error: "Quiz evaluation failed" }, { status: 502 });
  }

  let verified = false;
  if (evaluation.score >= 80) {
    const update = await supabaseAdmin.from("employee_skills").update({ source: "verified" }).eq("employee_id", employeeId).eq("skill_id", skillId);
    if (update.error) return NextResponse.json({ error: update.error.message }, { status: 500 });
    verified = true;
  }

  const employeeSkillIds = new Set((skillRows ?? []).map((row) => row.skill_id));
  if (verified) employeeSkillIds.add(skillId);
  const roleScores = ROLES.map((role) => ({
    title: role.title,
    score: scoreEmployeeForRole(employeeSkillIds, ROLE_SKILLS.filter((roleSkill) => roleSkill.role_id === role.id)).score,
  }));
  return NextResponse.json({ score: evaluation.score, feedback: evaluation.feedback, verified, roleScores });
}
