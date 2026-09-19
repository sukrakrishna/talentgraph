import { test } from "node:test";
import assert from "node:assert/strict";
import { computeScore, scoreEmployeeForRole } from "./scoring";

test("computeScore matches the documented formula", () => {
  assert.equal(
    computeScore({ requiredCovered: 6, requiredTotal: 8, preferredCovered: 3, preferredTotal: 4 }),
    75
  );
  assert.equal(
    computeScore({ requiredCovered: 8, requiredTotal: 8, preferredCovered: 4, preferredTotal: 4 }),
    100
  );
  assert.equal(
    computeScore({ requiredCovered: 0, requiredTotal: 8, preferredCovered: 0, preferredTotal: 4 }),
    0
  );
});

test("Ravi K. scores exactly 75% on the Data Analyst role", () => {
  const roleSkills = [
    ...["sql", "data-visualization", "excel", "dashboarding", "statistics", "a-b-testing", "data-cleaning", "business-reporting"].map(
      (skill_id) => ({ skill_id, importance: "required" as const })
    ),
    ...["python", "stakeholder-communication", "process-improvement", "forecasting"].map(
      (skill_id) => ({ skill_id, importance: "preferred" as const })
    ),
  ];
  const raviSkills = new Set([
    "sql",
    "data-visualization",
    "excel",
    "dashboarding",
    "data-cleaning",
    "business-reporting",
    "stakeholder-communication",
    "process-improvement",
    "forecasting",
    "react",
    "mentoring",
    "ticket-triage",
    "customer-support",
  ]);

  const result = scoreEmployeeForRole(raviSkills, roleSkills);

  assert.equal(result.score, 75);
  assert.equal(result.requiredCovered, 6);
  assert.equal(result.preferredCovered, 3);
  assert.deepEqual(result.missingRequired.sort(), ["a-b-testing", "statistics"]);
  assert.deepEqual(result.missingPreferred, ["python"]);
});

test("adding Statistics moves Ravi from 75% to 84%", () => {
  const roleSkills = [
    ...["sql", "data-visualization", "excel", "dashboarding", "statistics", "a-b-testing", "data-cleaning", "business-reporting"].map(
      (skill_id) => ({ skill_id, importance: "required" as const })
    ),
    ...["python", "stakeholder-communication", "process-improvement", "forecasting"].map(
      (skill_id) => ({ skill_id, importance: "preferred" as const })
    ),
  ];
  const raviPlusStats = new Set([
    "sql",
    "data-visualization",
    "excel",
    "dashboarding",
    "data-cleaning",
    "business-reporting",
    "statistics",
    "stakeholder-communication",
    "process-improvement",
    "forecasting",
  ]);

  assert.equal(scoreEmployeeForRole(raviPlusStats, roleSkills).score, 84);
});

test("adding both Statistics and Python moves Ravi from 75% to 91%", () => {
  const roleSkills = [
    ...["sql", "data-visualization", "excel", "dashboarding", "statistics", "a-b-testing", "data-cleaning", "business-reporting"].map(
      (skill_id) => ({ skill_id, importance: "required" as const })
    ),
    ...["python", "stakeholder-communication", "process-improvement", "forecasting"].map(
      (skill_id) => ({ skill_id, importance: "preferred" as const })
    ),
  ];
  const raviPlusBoth = new Set([
    "sql",
    "data-visualization",
    "excel",
    "dashboarding",
    "data-cleaning",
    "business-reporting",
    "statistics",
    "python",
    "stakeholder-communication",
    "process-improvement",
    "forecasting",
  ]);

  assert.equal(scoreEmployeeForRole(raviPlusBoth, roleSkills).score, 91);
});
