import { NextResponse } from "next/server";
import { EMPLOYEES, EMPLOYEE_SKILLS } from "@/data/employees";
import { COURSES } from "@/data/courses";
import { ROLES, ROLE_SKILLS } from "@/data/roles";
import { SKILLS_BY_ID } from "@/data/skills";
import { scoreEmployeeForRole } from "@/lib/scoring";

function skillName(id: string): string {
  return SKILLS_BY_ID.get(id)?.name ?? id;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  const roleId = searchParams.get("roleId");

  if (!employeeId || !roleId) {
    return NextResponse.json(
      { error: "employeeId and roleId query parameters are required" },
      { status: 400 }
    );
  }

  const employee = EMPLOYEES.find((item) => item.id === employeeId);
  const role = ROLES.find((item) => item.id === roleId);
  if (!employee) {
    return NextResponse.json({ error: `No employee with id "${employeeId}"` }, { status: 404 });
  }
  if (!role) {
    return NextResponse.json({ error: `No role with id "${roleId}"` }, { status: 404 });
  }

  const employeeSkillIds = new Set(
    EMPLOYEE_SKILLS.filter((skill) => skill.employee_id === employeeId).map((skill) => skill.skill_id)
  );
  const roleSkills = ROLE_SKILLS.filter((skill) => skill.role_id === roleId);
  const baseline = scoreEmployeeForRole(employeeSkillIds, roleSkills);
  const missingSkillIds = new Set([...baseline.missingRequired, ...baseline.missingPreferred]);
  const courses = COURSES.filter((course) => missingSkillIds.has(course.skill_id)).map((course) => {
    const requirement = roleSkills.find((skill) => skill.skill_id === course.skill_id);
    return {
      ...course,
      skill_name: skillName(course.skill_id),
      importance: requirement?.importance ?? "preferred",
    };
  });

  return NextResponse.json({
    employee: { id: employee.id, name: employee.name },
    employeeSkillIds: [...employeeSkillIds],
    role: { id: role.id, title: role.title },
    roleSkills: roleSkills.map((skill) => ({
      id: skill.skill_id,
      name: skillName(skill.skill_id),
      importance: skill.importance,
    })),
    baseline,
    courses,
  });
}
