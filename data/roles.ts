import { skillId } from "@/data/skills";

export interface RoleDef {
  id: string;
  title: string;
  team: string;
  department: string;
  description: string;
}

export interface RoleSkillDef {
  role_id: string;
  skill_id: string;
  importance: "required" | "preferred";
}

export const ROLES: RoleDef[] = [
  {
    id: "data-analyst",
    title: "Data Analyst",
    team: "Operations Analytics",
    department: "Operations",
    description:
      "Turns operational data into reports and dashboards that drive weekly decisions across the org.",
  },
  {
    id: "senior-frontend-engineer",
    title: "Senior Frontend Engineer",
    team: "Web Platform",
    department: "Engineering",
    description:
      "Owns the architecture of customer-facing web apps and mentors engineers on UI craft.",
  },
  {
    id: "backend-engineer",
    title: "Backend Engineer",
    team: "Core Services",
    department: "Engineering",
    description:
      "Builds and scales the APIs and services that power the product's core workflows.",
  },
  {
    id: "devops-engineer",
    title: "DevOps Engineer",
    team: "Infrastructure",
    department: "Engineering",
    description:
      "Runs the cloud infrastructure, CI/CD pipelines, and on-call reliability practices.",
  },
  {
    id: "engineering-manager",
    title: "Engineering Manager",
    team: "Engineering Leadership",
    department: "Engineering",
    description:
      "Leads a team of engineers, balancing delivery, growth, and technical direction.",
  },
  {
    id: "product-designer",
    title: "Product Designer",
    team: "Product Design",
    department: "Design",
    description:
      "Designs end-to-end product experiences, from wireframe to polished interface.",
  },
  {
    id: "ux-researcher",
    title: "UX Researcher",
    team: "Research",
    department: "Design",
    description:
      "Runs qualitative and quantitative research to guide product and design decisions.",
  },
  {
    id: "support-engineer-ii",
    title: "Support Engineer II",
    team: "Technical Support",
    department: "Support",
    description:
      "Handles escalated technical tickets and builds internal tools to speed up resolution.",
  },
  {
    id: "customer-support-lead",
    title: "Customer Support Lead",
    team: "Support Leadership",
    department: "Support",
    description:
      "Leads a pod of support agents, owns SLAs, and coaches the team on quality.",
  },
  {
    id: "account-executive",
    title: "Account Executive",
    team: "Enterprise Sales",
    department: "Sales",
    description:
      "Owns the full sales cycle for enterprise accounts, from pitch to close.",
  },
  {
    id: "sales-development-rep",
    title: "Sales Development Rep",
    team: "Outbound Sales",
    department: "Sales",
    description:
      "Generates and qualifies pipeline for the sales team through outbound prospecting.",
  },
  {
    id: "operations-manager",
    title: "Operations Manager",
    team: "Ops Management",
    department: "Operations",
    description:
      "Runs day-to-day operations, vendor relationships, and process improvement initiatives.",
  },
];

function req(role_id: string, names: string[]): RoleSkillDef[] {
  return names.map((name) => ({ role_id, skill_id: skillId(name), importance: "required" }));
}
function pref(role_id: string, names: string[]): RoleSkillDef[] {
  return names.map((name) => ({ role_id, skill_id: skillId(name), importance: "preferred" }));
}

export const ROLE_SKILLS: RoleSkillDef[] = [
  // Data Analyst — 8 required + 4 preferred (tuned so Ravi K. scores exactly 75%)
  ...req("data-analyst", [
    "SQL",
    "Data Visualization",
    "Excel",
    "Dashboarding",
    "Statistics",
    "A/B Testing",
    "Data Cleaning",
    "Business Reporting",
  ]),
  ...pref("data-analyst", [
    "Python",
    "Stakeholder Communication",
    "Process Improvement",
    "Forecasting",
  ]),

  ...req("senior-frontend-engineer", [
    "JavaScript",
    "TypeScript",
    "React",
    "System Design",
    "Unit Testing",
    "Git",
  ]),
  ...pref("senior-frontend-engineer", [
    "Accessibility Design",
    "Code Review",
    "Mobile Development",
    "CI/CD",
  ]),

  ...req("backend-engineer", [
    "Node.js",
    "SQL",
    "REST APIs",
    "System Design",
    "Microservices",
    "Git",
  ]),
  ...pref("backend-engineer", ["Docker", "Kubernetes", "GraphQL", "Unit Testing"]),

  ...req("devops-engineer", [
    "Docker",
    "Kubernetes",
    "CI/CD",
    "AWS",
    "Terraform",
    "Linux Administration",
    "Infrastructure as Code",
  ]),
  ...pref("devops-engineer", [
    "Monitoring & Observability",
    "Incident Response",
    "Site Reliability",
    "Security Best Practices",
  ]),

  ...req("engineering-manager", [
    "Team Leadership",
    "Code Review",
    "System Design",
    "Stakeholder Communication",
    "Performance Management",
    "Hiring & Interviewing",
  ]),
  ...pref("engineering-manager", [
    "Strategic Planning",
    "Agile Development",
    "Mentoring",
    "Decision Making",
  ]),

  ...req("product-designer", [
    "UI Design",
    "Figma",
    "Prototyping",
    "Design Systems",
    "Interaction Design",
    "Wireframing",
    "Visual Design",
  ]),
  ...pref("product-designer", [
    "UX Research",
    "User Testing",
    "Accessibility Design",
    "Typography",
  ]),

  ...req("ux-researcher", [
    "UX Research",
    "User Testing",
    "Survey Design",
    "Cohort Analysis",
    "Information Architecture",
    "Stakeholder Communication",
  ]),
  ...pref("ux-researcher", [
    "Data Visualization",
    "Prototyping",
    "Product Analytics",
    "Public Speaking",
  ]),

  ...req("support-engineer-ii", [
    "Technical Troubleshooting",
    "Customer Support",
    "Ticket Triage",
    "Knowledge Base Writing",
    "SLA Management",
    "Escalation Management",
  ]),
  ...pref("support-engineer-ii", ["SQL", "Zendesk", "Debugging", "Customer Onboarding"]),

  ...req("customer-support-lead", [
    "Team Leadership",
    "Escalation Management",
    "SLA Management",
    "Coaching",
    "Customer Satisfaction Analysis",
    "Performance Management",
  ]),
  ...pref("customer-support-lead", [
    "Stakeholder Communication",
    "Process Improvement",
    "Hiring & Interviewing",
    "Workflow Automation",
  ]),

  ...req("account-executive", [
    "Prospecting",
    "Negotiation",
    "CRM Management",
    "Solution Selling",
    "Pipeline Management",
    "Sales Presentations",
  ]),
  ...pref("account-executive", [
    "Salesforce",
    "Account Management",
    "Contract Negotiation",
    "Customer Relationship Building",
  ]),

  ...req("sales-development-rep", [
    "Prospecting",
    "Cold Calling",
    "Lead Qualification",
    "CRM Management",
    "Sales Presentations",
    "Territory Planning",
  ]),
  ...pref("sales-development-rep", ["Salesforce", "Sales Enablement", "Email Marketing"]),

  ...req("operations-manager", [
    "Process Improvement",
    "Project Management",
    "Vendor Management",
    "Resource Planning",
    "Budget Management",
    "Risk Management",
    "Operational Reporting",
  ]),
  ...pref("operations-manager", [
    "Change Management",
    "Stakeholder Communication",
    "Quality Assurance",
    "Compliance",
  ]),
];
