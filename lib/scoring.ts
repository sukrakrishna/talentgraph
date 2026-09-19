export type SkillImportance = "required" | "preferred";

export interface RoleSkillRequirement {
  skill_id: string;
  importance: SkillImportance;
}

export interface ScoreBreakdown {
  score: number;
  requiredCovered: number;
  requiredTotal: number;
  preferredCovered: number;
  preferredTotal: number;
  missingRequired: string[];
  missingPreferred: string[];
}

/**
 * Score = round(100 * (0.7 * requiredCovered/requiredTotal + 0.3 * preferredCovered/preferredTotal)).
 * A role with zero required or zero preferred skills treats that half of the formula as fully covered
 * (ratio 1) rather than dividing by zero.
 */
export function computeScore(input: {
  requiredCovered: number;
  requiredTotal: number;
  preferredCovered: number;
  preferredTotal: number;
}): number {
  const requiredRatio =
    input.requiredTotal > 0 ? input.requiredCovered / input.requiredTotal : 1;
  const preferredRatio =
    input.preferredTotal > 0 ? input.preferredCovered / input.preferredTotal : 1;
  return Math.round(100 * (0.7 * requiredRatio + 0.3 * preferredRatio));
}

export function scoreEmployeeForRole(
  employeeSkillIds: ReadonlySet<string>,
  roleSkills: RoleSkillRequirement[]
): ScoreBreakdown {
  const required = roleSkills.filter((s) => s.importance === "required");
  const preferred = roleSkills.filter((s) => s.importance === "preferred");

  const missingRequired = required
    .filter((s) => !employeeSkillIds.has(s.skill_id))
    .map((s) => s.skill_id);
  const missingPreferred = preferred
    .filter((s) => !employeeSkillIds.has(s.skill_id))
    .map((s) => s.skill_id);

  const requiredCovered = required.length - missingRequired.length;
  const preferredCovered = preferred.length - missingPreferred.length;

  const score = computeScore({
    requiredCovered,
    requiredTotal: required.length,
    preferredCovered,
    preferredTotal: preferred.length,
  });

  return {
    score,
    requiredCovered,
    requiredTotal: required.length,
    preferredCovered,
    preferredTotal: preferred.length,
    missingRequired,
    missingPreferred,
  };
}
