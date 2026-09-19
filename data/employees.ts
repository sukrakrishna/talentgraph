import { skillId, SKILLS } from "@/data/skills";
import { slugify } from "@/lib/slugify";

export interface EmployeeDef {
  id: string;
  name: string;
  job_title: string;
  department: string;
  bio: string;
}

export interface EmployeeSkillDef {
  employee_id: string;
  skill_id: string;
  source: "explicit" | "inferred";
  evidence: string;
  proficiency: number;
  /** Explicit skill ids this inferred skill was derived from. Empty for explicit skills. */
  linked_to: string[];
}

// --- Ravi K., the scripted demo employee ---------------------------------
// Tuned against data/roles.ts's "data-analyst" role (8 required / 4 preferred)
// to land at exactly 75%: 6/8 required (missing Statistics, A/B Testing) and
// 3/4 preferred (missing Python). See lib/scoring.ts for the formula.
export const RAVI: EmployeeDef = {
  id: "ravi-k",
  name: "Ravi K.",
  job_title: "Support Engineer",
  department: "Support",
  bio: "Built an internal dashboard in React with charts for ticket trends. Writes weekly SQL reports for the operations team and runs their triage review. Mentored 3 junior agents.",
};

// Evidence strings below are exact substrings of RAVI.bio — every one of them must be
// verifiable with `RAVI.bio.includes(evidence)` (see data/employees.test-ish check in
// scripts/seed.ts's demo output, and the same rule the /api/extract route enforces on
// LLM-extracted profiles).
const RAVI_SKILLS: EmployeeSkillDef[] = [
  {
    employee_id: RAVI.id,
    skill_id: skillId("SQL"),
    source: "explicit",
    evidence: "Writes weekly SQL reports for the operations team",
    proficiency: 3,
    linked_to: [],
  },
  {
    employee_id: RAVI.id,
    skill_id: skillId("Business Reporting"),
    source: "explicit",
    evidence: "Writes weekly SQL reports for the operations team",
    proficiency: 3,
    linked_to: [],
  },
  {
    employee_id: RAVI.id,
    skill_id: skillId("React"),
    source: "explicit",
    evidence: "Built an internal dashboard in React with charts for ticket trends",
    proficiency: 2,
    linked_to: [],
  },
  {
    employee_id: RAVI.id,
    skill_id: skillId("Dashboarding"),
    source: "explicit",
    evidence: "Built an internal dashboard in React with charts for ticket trends",
    proficiency: 3,
    linked_to: [],
  },
  {
    employee_id: RAVI.id,
    skill_id: skillId("Data Visualization"),
    source: "explicit",
    evidence: "Built an internal dashboard in React with charts for ticket trends",
    proficiency: 2,
    linked_to: [],
  },
  {
    employee_id: RAVI.id,
    skill_id: skillId("Mentoring"),
    source: "explicit",
    evidence: "Mentored 3 junior agents",
    proficiency: 3,
    linked_to: [],
  },
  {
    employee_id: RAVI.id,
    skill_id: skillId("Ticket Triage"),
    source: "explicit",
    evidence: "runs their triage review",
    proficiency: 3,
    linked_to: [],
  },
  {
    employee_id: RAVI.id,
    skill_id: skillId("Excel"),
    source: "inferred",
    evidence: "Writes weekly SQL reports for the operations team",
    proficiency: 2,
    linked_to: [skillId("SQL"), skillId("Business Reporting")],
  },
  {
    employee_id: RAVI.id,
    skill_id: skillId("Data Cleaning"),
    source: "inferred",
    evidence: "Built an internal dashboard in React with charts for ticket trends",
    proficiency: 2,
    linked_to: [skillId("Dashboarding"), skillId("Data Visualization")],
  },
  {
    employee_id: RAVI.id,
    skill_id: skillId("Process Improvement"),
    source: "inferred",
    evidence: "runs their triage review",
    proficiency: 2,
    linked_to: [skillId("Ticket Triage")],
  },
  {
    employee_id: RAVI.id,
    skill_id: skillId("Forecasting"),
    source: "inferred",
    evidence: "Writes weekly SQL reports for the operations team",
    proficiency: 1,
    linked_to: [skillId("SQL"), skillId("Business Reporting")],
  },
  {
    employee_id: RAVI.id,
    skill_id: skillId("Stakeholder Communication"),
    source: "inferred",
    evidence: "runs their triage review",
    proficiency: 2,
    linked_to: [skillId("Ticket Triage")],
  },
  {
    employee_id: RAVI.id,
    skill_id: skillId("Customer Support"),
    source: "inferred",
    evidence: "runs their triage review",
    proficiency: 3,
    linked_to: [skillId("Ticket Triage")],
  },
];

// --- The other 39 employees, generated deterministically ------------------

function mulberry32(seed: number) {
  return function rng() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sample<T>(rng: () => number, arr: T[], n: number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  const count = Math.min(n, pool.length);
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

const byCategory = (cat: string) =>
  SKILLS.filter((s) => s.category === cat).map((s) => s.name);

const LEADERSHIP_POOL = byCategory("Leadership & Soft Skills");

interface DeptConfig {
  department: string;
  firstNames: string[];
  lastInitials: string[];
  jobTitles: string[];
  skillPool: string[];
  hiddenTalentPool: string[];
  bioTemplates: string[];
}

const DEPTS: DeptConfig[] = [
  {
    department: "Engineering",
    firstNames: ["Priya", "Marcus", "Elena", "Diego", "Fatima", "James", "Ling", "Omar"],
    lastInitials: ["S", "T", "R", "M", "H", "O", "W", "F"],
    jobTitles: [
      "Software Engineer",
      "Senior Software Engineer",
      "Frontend Engineer",
      "Backend Engineer",
      "DevOps Engineer",
      "Engineering Manager",
      "QA Engineer",
      "Mobile Engineer",
    ],
    skillPool: [...byCategory("Engineering"), ...byCategory("Cloud & DevOps")],
    hiddenTalentPool: [...byCategory("Design"), ...byCategory("Product")],
    bioTemplates: [
      "Ships features as a {title}, recently focused on {a} and {b} across the team's core services.",
      "As {title}, spends most sprints deep in {a}, with growing ownership of {b}.",
    ],
  },
  {
    department: "Support",
    firstNames: ["Sofia", "Liam", "Aisha", "Noah", "Mei", "Carlos", "Grace"],
    lastInitials: ["B", "P", "N", "G", "L", "V", "D"],
    jobTitles: [
      "Support Engineer",
      "Senior Support Engineer",
      "Customer Support Specialist",
      "Support Team Lead",
      "Technical Support Analyst",
      "Support Engineer II",
      "Help Desk Analyst",
    ],
    skillPool: [...byCategory("Support"), ...byCategory("Data & Analytics").slice(0, 5)],
    hiddenTalentPool: [...byCategory("Engineering").slice(0, 6)],
    bioTemplates: [
      "Works as a {title} handling day-to-day {a}, with a growing focus on {b}.",
      "{title} known for calm handling of escalations, leaning on {a} and {b} daily.",
    ],
  },
  {
    department: "Operations",
    firstNames: ["Ethan", "Nadia", "Lucas", "Priyanka", "Ben", "Yuki", "Hassan", "Ines"],
    lastInitials: ["K", "Q", "Y", "M", "C", "T", "A", "P"],
    jobTitles: [
      "Operations Analyst",
      "Operations Coordinator",
      "Operations Manager",
      "Process Analyst",
      "Supply Chain Analyst",
      "Business Operations Associate",
      "Logistics Coordinator",
      "Operations Associate",
    ],
    skillPool: [...byCategory("Operations"), ...byCategory("Data & Analytics")],
    hiddenTalentPool: [...byCategory("Engineering").slice(0, 4), ...byCategory("Sales").slice(0, 4)],
    bioTemplates: [
      "{title} who keeps the team's processes running, focused on {a} and {b}.",
      "Coordinates cross-team logistics as {title}, applying {a} and {b} weekly.",
    ],
  },
  {
    department: "Sales",
    firstNames: ["Derek", "Amara", "Victor", "Chloe", "Tariq", "Ingrid", "Sam", "Leah"],
    lastInitials: ["W", "J", "S", "R", "B", "N", "O", "F"],
    jobTitles: [
      "Account Executive",
      "Sales Development Rep",
      "Sales Manager",
      "Customer Success Manager",
      "Business Development Rep",
      "Regional Sales Manager",
      "Sales Operations Analyst",
      "Account Manager",
    ],
    skillPool: [...byCategory("Sales"), ...byCategory("Marketing")],
    hiddenTalentPool: [...byCategory("Data & Analytics").slice(0, 4)],
    bioTemplates: [
      "{title} building pipeline through {a}, with a strong track record in {b}.",
      "Closes deals as {title}, relying on {a} and {b} to manage the book of business.",
    ],
  },
  {
    department: "Design",
    firstNames: ["Maya", "Felix", "Zara", "Oliver", "Ana", "Jonas", "Ruth", "Kenji"],
    lastInitials: ["P", "G", "K", "D", "C", "R", "M", "I"],
    jobTitles: [
      "Product Designer",
      "UX Researcher",
      "UI Designer",
      "Design Lead",
      "Visual Designer",
      "Interaction Designer",
      "Design Systems Engineer",
      "Brand Designer",
    ],
    skillPool: [...byCategory("Design"), ...byCategory("Product")],
    hiddenTalentPool: [...byCategory("Engineering").slice(0, 4)],
    bioTemplates: [
      "{title} shaping product experience through {a} and {b}.",
      "As {title}, partners with product and engineering using {a} and {b}.",
    ],
  },
];

function generateEmployees(): { employees: EmployeeDef[]; skills: EmployeeSkillDef[] } {
  const employees: EmployeeDef[] = [];
  const skills: EmployeeSkillDef[] = [];
  const usedIds = new Set<string>([RAVI.id]);

  let seed = 1;
  for (const dept of DEPTS) {
    dept.firstNames.forEach((first, i) => {
      const rng = mulberry32(seed++);
      const last = dept.lastInitials[i];
      const name = `${first} ${last}.`;
      let id = slugify(`${first}-${last}`);
      while (usedIds.has(id)) id = `${id}-2`;
      usedIds.add(id);

      const jobTitle = pick(rng, dept.jobTitles);
      const [skillA, skillB] = sample(rng, dept.skillPool, 2);
      const inferredExtras = sample(
        rng,
        dept.skillPool.filter((s) => s !== skillA && s !== skillB),
        1 + Math.floor(rng() * 2)
      );
      const template = pick(rng, dept.bioTemplates);
      const bio = template
        .replace("{title}", jobTitle)
        .replace("{a}", skillA)
        .replace("{b}", skillB);

      employees.push({ id, name, job_title: jobTitle, department: dept.department, bio });

      skills.push(
        {
          employee_id: id,
          skill_id: skillId(skillA),
          source: "explicit",
          evidence: `Bio: "${bio}"`,
          proficiency: 2 + Math.round(rng()),
          linked_to: [],
        },
        {
          employee_id: id,
          skill_id: skillId(skillB),
          source: "explicit",
          evidence: `Bio: "${bio}"`,
          proficiency: 2 + Math.round(rng()),
          linked_to: [],
        }
      );

      for (const extra of inferredExtras) {
        skills.push({
          employee_id: id,
          skill_id: skillId(extra),
          source: "inferred",
          evidence: `Inferred from role context: ${jobTitle} work commonly involves ${extra}.`,
          proficiency: 1 + Math.floor(rng() * 2),
          linked_to: [skillId(skillA), skillId(skillB)],
        });
      }

      // 30% chance of a cross-cutting leadership skill
      if (rng() < 0.3) {
        const leadershipSkill = pick(rng, LEADERSHIP_POOL);
        skills.push({
          employee_id: id,
          skill_id: skillId(leadershipSkill),
          source: "inferred",
          evidence: `Inferred from role context: ${jobTitle}s regularly practice ${leadershipSkill}.`,
          proficiency: 1 + Math.floor(rng() * 2),
          linked_to: [skillId(skillA), skillId(skillB)],
        });
      }

      // 15% chance of a "hidden talent" skill from outside the department
      if (rng() < 0.15 && dept.hiddenTalentPool.length > 0) {
        const hidden = pick(rng, dept.hiddenTalentPool);
        skills.push({
          employee_id: id,
          skill_id: skillId(hidden),
          source: "explicit",
          evidence: `Side project or prior role experience with ${hidden}, outside their current day-to-day.`,
          proficiency: 1 + Math.floor(rng() * 2),
          linked_to: [],
        });
      }
    });
  }

  return { employees, skills };
}

const { employees: GENERATED_EMPLOYEES, skills: GENERATED_SKILLS } = generateEmployees();

export const EMPLOYEES: EmployeeDef[] = [RAVI, ...GENERATED_EMPLOYEES];
export const EMPLOYEE_SKILLS: EmployeeSkillDef[] = [...RAVI_SKILLS, ...GENERATED_SKILLS];
