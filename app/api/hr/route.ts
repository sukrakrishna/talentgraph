import { NextResponse } from "next/server";
import { EMPLOYEES, EMPLOYEE_SKILLS } from "@/data/employees";
import { ROLES, ROLE_SKILLS } from "@/data/roles";
import { SKILLS, SKILLS_BY_ID, skillId } from "@/data/skills";

const AVG_EXTERNAL_SALARY_LAKHS = 8;
const AGENCY_FEE_PERCENT = 20;
const AVG_TIME_TO_FILL_DAYS = 18;

export async function GET() {
  const departments = [...new Set(EMPLOYEES.map((employee) => employee.department))];
  const categories = [...new Set(SKILLS.map((skill) => skill.category))];
  const skillsByEmployee = new Map<string, Set<string>>();

  for (const skill of EMPLOYEE_SKILLS) {
    const skills = skillsByEmployee.get(skill.employee_id) ?? new Set<string>();
    skills.add(skill.skill_id);
    skillsByEmployee.set(skill.employee_id, skills);
  }

  const heatmap = departments.map((department) => {
    const employeeIds = EMPLOYEES.filter((employee) => employee.department === department).map(
      (employee) => employee.id
    );
    return {
      department,
      values: categories.map((category) => {
        const categorySkillIds = new Set(
          SKILLS.filter((skill) => skill.category === category).map((skill) => skillId(skill.name))
        );
        const representedSkillIds = new Set(
          employeeIds.flatMap((employeeId) =>
            [...(skillsByEmployee.get(employeeId) ?? [])].filter((skillId) =>
              categorySkillIds.has(skillId)
            )
          )
        );
        return {
          category,
          coverage: Math.round((representedSkillIds.size / categorySkillIds.size) * 100),
        };
      }),
    };
  });

  const hiddenTalent: {
    employeeId: string;
    employeeName: string;
    currentDepartment: string;
    roleId: string;
    roleTitle: string;
    roleDepartment: string;
    matchedSkills: string[];
  }[] = [];

  for (const employee of EMPLOYEES) {
    const employeeSkills = skillsByEmployee.get(employee.id) ?? new Set<string>();
    const outsideMatches = ROLES.map((role) => {
      if (role.department === employee.department) return null;
      const matchedSkills = ROLE_SKILLS.filter(
        (skill) => skill.role_id === role.id && employeeSkills.has(skill.skill_id)
      ).map((skill) => SKILLS_BY_ID.get(skill.skill_id)?.name ?? skill.skill_id);
      return matchedSkills.length > 0 ? { role, matchedSkills } : null;
    })
      .filter((match): match is { role: (typeof ROLES)[number]; matchedSkills: string[] } => match !== null)
      .sort((a, b) => b.matchedSkills.length - a.matchedSkills.length)
      .slice(0, 2);

    for (const match of outsideMatches) {
      hiddenTalent.push({
        employeeId: employee.id,
        employeeName: employee.name,
        currentDepartment: employee.department,
        roleId: match.role.id,
        roleTitle: match.role.title,
        roleDepartment: match.role.department,
        matchedSkills: match.matchedSkills,
      });
    }
  }

  const allRoleSkillIds = new Set(ROLE_SKILLS.map((skill) => skill.skill_id));
  const coveredRoleSkillIds = new Set(
    EMPLOYEE_SKILLS.map((skill) => skill.skill_id).filter((skillId) => allRoleSkillIds.has(skillId))
  );
  const internallyMatchedRoles = new Set(hiddenTalent.map((match) => match.roleId));

  return NextResponse.json({
    kpis: {
      totalInternalMobilityRate: Math.round(
        (new Set(hiddenTalent.map((match) => match.employeeId)).size / EMPLOYEES.length) * 100
      ),
      hiddenSkillMatchCount: hiddenTalent.length,
      skillsGapCoverage: Math.round((coveredRoleSkillIds.size / allRoleSkillIds.size) * 100),
      avgTimeToFillDays: AVG_TIME_TO_FILL_DAYS,
    },
    heatmap: { departments, categories, rows: heatmap },
    hiddenTalent,
    costAvoidance: {
      rolesFilledInternally: internallyMatchedRoles.size,
      avgExternalSalaryLakhs: AVG_EXTERNAL_SALARY_LAKHS,
      agencyFeePercent: AGENCY_FEE_PERCENT,
    },
  });
}
