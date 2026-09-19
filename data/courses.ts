import { slugify } from "@/lib/slugify";
import { skillId } from "@/data/skills";

export interface CourseDef {
  id: string;
  title: string;
  hours: number;
  skill_id: string;
}

interface CourseInput {
  title: string;
  hours: number;
  skill: string;
}

// Demo path for Ravi K. on the Data Analyst role (baseline score 75%, required 6/8, preferred 3/4):
//   + "Statistics for Analysts" alone  -> required 7/8, preferred 3/4 -> score 84  (+9)
//   + "Python for Data Analysis" alone -> required 6/8, preferred 4/4 -> score 83  (+8)
//   + both courses together            -> required 7/8, preferred 4/4 -> score 91  (+16 combined)
// The two deltas (+9, +8) don't sum to the combined delta (+16) because each is measured
// from the same 75% baseline, not chained — see lib/scoring.ts for the formula.
const COURSE_INPUTS: CourseInput[] = [
  { title: "Statistics for Analysts", hours: 6, skill: "Statistics" },
  { title: "Python for Data Analysis", hours: 8, skill: "Python" },
  { title: "A/B Testing Fundamentals", hours: 4, skill: "A/B Testing" },
  { title: "Advanced Excel for Analysts", hours: 3, skill: "Excel" },
  { title: "Dashboard Design with Data Visualization", hours: 5, skill: "Data Visualization" },
  { title: "Data Cleaning Bootcamp", hours: 4, skill: "Data Cleaning" },
  { title: "Forecasting Techniques", hours: 5, skill: "Forecasting" },
  { title: "Intro to Machine Learning", hours: 10, skill: "Machine Learning" },
  { title: "SQL for Engineers", hours: 6, skill: "SQL" },
  { title: "TypeScript in Practice", hours: 6, skill: "TypeScript" },
  { title: "React Advanced Patterns", hours: 8, skill: "React" },
  { title: "System Design Fundamentals", hours: 8, skill: "System Design" },
  { title: "Docker & Kubernetes Essentials", hours: 8, skill: "Kubernetes" },
  { title: "AWS Cloud Practitioner", hours: 10, skill: "AWS" },
  { title: "CI/CD Pipelines with Terraform", hours: 6, skill: "Terraform" },
  { title: "Incident Response Playbooks", hours: 4, skill: "Incident Response" },
  { title: "Figma for Product Teams", hours: 4, skill: "Figma" },
  { title: "Design Systems at Scale", hours: 6, skill: "Design Systems" },
  { title: "UX Research Methods", hours: 6, skill: "UX Research" },
  { title: "Accessibility Design Essentials", hours: 4, skill: "Accessibility Design" },
  { title: "Negotiation Skills for Sales", hours: 4, skill: "Negotiation" },
  { title: "Salesforce Administration", hours: 8, skill: "Salesforce" },
  { title: "Solution Selling Workshop", hours: 5, skill: "Solution Selling" },
  { title: "Customer Escalation Management", hours: 3, skill: "Escalation Management" },
  { title: "Zendesk for Support Teams", hours: 3, skill: "Zendesk" },
  { title: "SLA Management Best Practices", hours: 3, skill: "SLA Management" },
  { title: "Process Improvement with Lean", hours: 5, skill: "Process Improvement" },
  { title: "Project Management Fundamentals", hours: 8, skill: "Project Management" },
  { title: "Team Leadership Essentials", hours: 6, skill: "Team Leadership" },
  { title: "Stakeholder Communication Workshop", hours: 3, skill: "Stakeholder Communication" },
];

export const COURSES: CourseDef[] = COURSE_INPUTS.map((c) => ({
  id: slugify(c.title),
  title: c.title,
  hours: c.hours,
  skill_id: skillId(c.skill),
}));
