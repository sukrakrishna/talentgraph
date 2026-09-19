import { slugify } from "@/lib/slugify";

export interface SkillDef {
  name: string;
  category: string;
}

const ENGINEERING = [
  "JavaScript",
  "TypeScript",
  "React",
  "Node.js",
  "Python",
  "Java",
  "Go",
  "SQL",
  "REST APIs",
  "GraphQL",
  "Microservices",
  "System Design",
  "Unit Testing",
  "Git",
  "Debugging",
  "Code Review",
  "Software Architecture",
  "Mobile Development",
  "API Testing",
  "Technical Documentation",
  "Agile Development",
];

const CLOUD_DEVOPS = [
  "AWS",
  "Azure",
  "GCP",
  "Docker",
  "Kubernetes",
  "CI/CD",
  "Terraform",
  "Linux Administration",
  "Monitoring & Observability",
  "Incident Response",
  "Infrastructure as Code",
  "Site Reliability",
  "Networking Fundamentals",
  "Security Best Practices",
];

const DATA_ANALYTICS = [
  "Statistics",
  "A/B Testing",
  "Data Visualization",
  "Data Cleaning",
  "Excel",
  "Dashboarding",
  "Business Reporting",
  "Forecasting",
  "Data Modeling",
  "Machine Learning",
  "Data Warehousing",
  "ETL Pipelines",
  "Business Intelligence",
  "Predictive Analytics",
  "Cohort Analysis",
  "Survey Design",
  "R Programming",
  "Data Governance",
];

const DESIGN = [
  "UI Design",
  "UX Research",
  "Wireframing",
  "Prototyping",
  "Design Systems",
  "Figma",
  "Interaction Design",
  "Visual Design",
  "Typography",
  "Accessibility Design",
  "User Testing",
  "Information Architecture",
  "Motion Design",
  "Branding",
  "Design Critique",
  "Usability Heuristics",
];

const PRODUCT = [
  "Product Strategy",
  "Roadmapping",
  "User Story Writing",
  "Backlog Grooming",
  "Market Research",
  "Competitive Analysis",
  "Feature Prioritization",
  "Product Analytics",
  "Product Positioning",
  "Go-to-Market Planning",
  "Pricing Strategy",
  "Customer Interviews",
];

const SALES = [
  "Prospecting",
  "Cold Calling",
  "Negotiation",
  "CRM Management",
  "Salesforce",
  "Account Management",
  "Lead Qualification",
  "Sales Forecasting",
  "Pipeline Management",
  "Solution Selling",
  "Contract Negotiation",
  "Upselling",
  "Customer Relationship Building",
  "Sales Presentations",
  "Territory Planning",
  "Sales Enablement",
];

const SUPPORT = [
  "Ticket Triage",
  "Customer Support",
  "Technical Troubleshooting",
  "Knowledge Base Writing",
  "Live Chat Support",
  "Escalation Management",
  "Customer Onboarding",
  "SLA Management",
  "Helpdesk Tools",
  "Zendesk",
  "Call Handling",
  "Customer Satisfaction Analysis",
  "Remote Support Tools",
];

const OPERATIONS = [
  "Process Improvement",
  "Supply Chain Management",
  "Inventory Management",
  "Vendor Management",
  "Project Management",
  "Business Process Design",
  "Quality Assurance",
  "Compliance",
  "Logistics Coordination",
  "Resource Planning",
  "Change Management",
  "Risk Management",
  "Operational Reporting",
  "Workflow Automation",
  "Budget Management",
];

const MARKETING = [
  "Content Marketing",
  "SEO",
  "Social Media Marketing",
  "Email Marketing",
  "Copywriting",
  "Brand Strategy",
  "Campaign Management",
  "Marketing Analytics",
  "Paid Advertising",
  "Event Marketing",
  "Marketing Automation",
];

const LEADERSHIP = [
  "Mentoring",
  "Team Leadership",
  "Stakeholder Communication",
  "Public Speaking",
  "Conflict Resolution",
  "Cross-functional Collaboration",
  "Time Management",
  "Strategic Planning",
  "Decision Making",
  "Coaching",
  "Performance Management",
  "Hiring & Interviewing",
  "Facilitation",
  "Emotional Intelligence",
];

const CATEGORY_LISTS: [string, string[]][] = [
  ["Engineering", ENGINEERING],
  ["Cloud & DevOps", CLOUD_DEVOPS],
  ["Data & Analytics", DATA_ANALYTICS],
  ["Design", DESIGN],
  ["Product", PRODUCT],
  ["Sales", SALES],
  ["Support", SUPPORT],
  ["Operations", OPERATIONS],
  ["Marketing", MARKETING],
  ["Leadership & Soft Skills", LEADERSHIP],
];

export const SKILLS: SkillDef[] = CATEGORY_LISTS.flatMap(([category, names]) =>
  names.map((name) => ({ name, category }))
);

const SKILL_BY_NAME = new Map(SKILLS.map((s) => [s.name.toLowerCase(), s]));

/** Resolves a skill's stable id from its display name. Throws if the name isn't in the taxonomy. */
export function skillId(name: string): string {
  const skill = SKILL_BY_NAME.get(name.toLowerCase());
  if (!skill) {
    throw new Error(`Unknown skill: "${name}" is not in the skills taxonomy`);
  }
  return slugify(skill.name);
}

export const SKILL_IDS = new Set(SKILLS.map((s) => slugify(s.name)));

export interface SkillRecord extends SkillDef {
  id: string;
}

/** id -> {id, name, category}, for resolving skill_ids read back from the database. */
export const SKILLS_BY_ID: Map<string, SkillRecord> = new Map(
  SKILLS.map((s) => [slugify(s.name), { ...s, id: slugify(s.name) }])
);
