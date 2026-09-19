"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Check, Plus, Clock3, ArrowRight } from "lucide-react";
import { EMPLOYEES } from "@/data/employees";
import { ROLES } from "@/data/roles";
import { scoreEmployeeForRole, type ScoreBreakdown } from "@/lib/scoring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportPdfButton } from "@/components/ExportPdfButton";

interface Course {
  id: string;
  title: string;
  hours: number;
  skill_id: string;
  skill_name: string;
  importance: "required" | "preferred";
}

interface WhatIfData {
  employee: { id: string; name: string };
  employeeSkillIds: string[];
  role: { id: string; title: string };
  roleSkills: { id: string; name: string; importance: "required" | "preferred" }[];
  baseline: ScoreBreakdown;
  courses: Course[];
}

const DEFAULT_EMPLOYEE_ID = "ravi-k";
const DEFAULT_ROLE_ID = "data-analyst";
const CORAL = "#FF7A6B";

function ScoreRing({ score, baseline }: { score: number; baseline: number }) {
  const radius = 92;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative mx-auto h-64 w-64">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 220 220" aria-label={`${score}% match`}>
        <circle cx="110" cy="110" r={radius} fill="none" stroke="var(--secondary)" strokeWidth="14" />
        <motion.circle
          cx="110"
          cy="110"
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeLinecap="round"
          strokeWidth="14"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: circumference * (1 - score / 100) }}
          initial={{ strokeDashoffset: circumference * (1 - baseline / 100) }}
          transition={{ type: "spring", stiffness: 65, damping: 16 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={score}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-heading text-6xl font-semibold tracking-tight"
        >
          {score}%
        </motion.span>
        <span className="text-sm text-muted-foreground">role match</span>
        {score !== baseline && <span className="mt-1 text-xs text-muted-foreground">was {baseline}%</span>}
      </div>
    </div>
  );
}

export function WhatIfClient() {
  const [employeeId, setEmployeeId] = useState(DEFAULT_EMPLOYEE_ID);
  const [roleId, setRoleId] = useState(DEFAULT_ROLE_ID);
  const [data, setData] = useState<WhatIfData | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [loadedScenario, setLoadedScenario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scenarioKey = `${employeeId}:${roleId}`;
  const loading = loadedScenario !== scenarioKey;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/whatif?employeeId=${encodeURIComponent(employeeId)}&roleId=${encodeURIComponent(roleId)}`)
      .then(async (response) => {
        const result = (await response.json()) as WhatIfData & { error?: string };
        if (!response.ok || result.error) throw new Error(result.error ?? "Unable to load what-if data");
        if (!cancelled) {
          setData(result);
          setSelectedCourseIds([]);
          setError(null);
          setLoadedScenario(scenarioKey);
        }
      })
      .catch((reason: unknown) => !cancelled && setError(reason instanceof Error ? reason.message : String(reason)))
      .finally(() => !cancelled && setLoadedScenario(scenarioKey));
    return () => {
      cancelled = true;
    };
  }, [employeeId, roleId, scenarioKey]);

  const selectedCourses = useMemo(
    () => data?.courses.filter((course) => selectedCourseIds.includes(course.id)) ?? [],
    [data, selectedCourseIds]
  );
  const current = useMemo(() => {
    if (!data) return null;
    const skillIds = new Set(data.employeeSkillIds);
    selectedCourses.forEach((course) => skillIds.add(course.skill_id));
    return scoreEmployeeForRole(skillIds, data.roleSkills.map((skill) => ({ skill_id: skill.id, importance: skill.importance })));
  }, [data, selectedCourses]);

  const missingSkills = useMemo(() => {
    if (!data || !current) return [];
    const names = new Map(data.roleSkills.map((skill) => [skill.id, skill.name]));
    return [...current.missingRequired, ...current.missingPreferred].map((id) => names.get(id) ?? id);
  }, [data, current]);

  function toggleCourse(courseId: string) {
    setSelectedCourseIds((ids) => ids.includes(courseId) ? ids.filter((id) => id !== courseId) : [...ids, courseId]);
  }

  function coursePoints(course: Course) {
    if (!data || !current) return 0;
    const withoutCourse = new Set(data.employeeSkillIds);
    selectedCourses.filter((item) => item.id !== course.id).forEach((item) => withoutCourse.add(item.skill_id));
    const before = scoreEmployeeForRole(withoutCourse, data.roleSkills.map((skill) => ({ skill_id: skill.id, importance: skill.importance })));
    const withCourse = new Set(withoutCourse);
    withCourse.add(course.skill_id);
    const after = scoreEmployeeForRole(withCourse, data.roleSkills.map((skill) => ({ skill_id: skill.id, importance: skill.importance })));
    return selectedCourseIds.includes(course.id) ? current.score - before.score : after.score - current.score;
  }

  const roadmap = useMemo(() => {
    if (!data || !current || selectedCourses.length === 0) return [];
    let hours = 0;
    const courseSteps = [...selectedCourses].sort((a, b) => (a.importance === "required" ? -1 : 1) - (b.importance === "required" ? -1 : 1));
    const steps = courseSteps.map((course) => {
      const startWeek = Math.floor(hours / 3) + 1;
      hours += course.hours;
      const endWeek = Math.ceil(hours / 3);
      return { label: course.title, detail: `Week ${startWeek}${endWeek > startWeek ? `-${endWeek}` : ""} · ${course.skill_name}` };
    });
    steps.push({ label: `Portfolio project using ${selectedCourses.map((course) => course.skill_name).join(" + ")}`, detail: `Week ${Math.ceil(hours / 3) + 1}-${Math.ceil(hours / 3) + 2} · show the work` });
    steps.push({ label: `Ready to apply: ${data.role.title}, ${current.score}% match`, detail: "Next move · share your evidence" });
    return steps;
  }, [data, current, selectedCourses]);

  const baseline = data?.baseline.score ?? 0;
  const score = current?.score ?? baseline;

  return (
    <div id="whatif-roadmap-report" className="pdf-report mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:px-8">
      <div className="flex flex-col gap-1 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.22em] text-primary">Scenario planner</p>
          <h1 className="font-heading text-4xl font-semibold tracking-tight">What would move the match?</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Build a focused learning plan for {data?.employee.name ?? "your employee"} and watch the role match update instantly.</p>
        </div>
        <Button variant="outline" onClick={() => setSelectedCourseIds([])} disabled={selectedCourseIds.length === 0}>
          <RotateCcw /> Reset
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader><CardTitle>Choose a scenario</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <label className="grid gap-2 text-sm font-medium">Employee
                <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                  {EMPLOYEES.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">Target role
                <select value={roleId} onChange={(event) => setRoleId(event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                  {ROLES.map((role) => <option key={role.id} value={role.id}>{role.title}</option>)}
                </select>
              </label>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-primary/20 bg-[linear-gradient(145deg,rgba(198,244,50,0.08),transparent_45%)]">
            <CardContent className="flex flex-col items-center px-6 py-8">
              {loading ? <div className="flex h-64 items-center text-sm text-muted-foreground">Loading scenario...</div> : error ? <p className="py-24 text-sm text-destructive">{error}</p> : <ScoreRing score={score} baseline={baseline} />}
              {data && current && <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Badge className="bg-primary text-primary-foreground">+{score - baseline} points gained</Badge>
                <Badge variant="secondary">Required {current.requiredCovered}/{current.requiredTotal}</Badge>
                <Badge variant="secondary">Preferred {current.preferredCovered}/{current.preferredTotal}</Badge>
              </div>}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="flex-row items-end justify-between gap-4"><div><CardTitle>Courses that close the gap</CardTitle><p className="mt-1 text-sm text-muted-foreground">Select a course to add its skill to the scenario.</p></div><span className="text-xs text-muted-foreground">{data?.courses.length ?? 0} available</span></CardHeader>
            <CardContent className="grid gap-2">
              {data?.courses.map((course) => {
                const selected = selectedCourseIds.includes(course.id);
                return <div key={course.id} className={`grid gap-3 rounded-xl border p-4 transition-colors sm:grid-cols-[minmax(0,1fr)_auto] ${selected ? "border-primary/60 bg-primary/5" : "border-border hover:border-muted-foreground/50"}`}>
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{course.title}</h3><Badge variant="outline">{course.importance}</Badge></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Clock3 className="size-3" />{course.hours} hours</span><span>adds {course.skill_name}</span><span className="font-medium text-primary">+{coursePoints(course)} pts live</span></div></div>
                  <Button variant={selected ? "secondary" : "outline"} onClick={() => toggleCourse(course.id)} aria-pressed={selected}>{selected ? <Check /> : <Plus />}{selected ? "Added" : "Add"}</Button>
                </div>;
              })}
              {data && data.courses.length === 0 && <p className="py-8 text-sm text-muted-foreground">This role has no missing skills with a course yet.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Remaining gap</CardTitle></CardHeader>
            <CardContent>{missingSkills.length > 0 ? <div className="flex flex-wrap gap-2">{missingSkills.map((skill) => <Badge key={skill} style={{ backgroundColor: CORAL, color: "#0d1014" }}>{skill}</Badge>)}</div> : <p className="text-sm font-medium text-primary">100% match. No missing skills.</p>}</CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-end justify-between gap-4"><div><CardTitle>Roadmap</CardTitle><p className="text-sm text-muted-foreground">A practical next sequence at 3 hours per week.</p></div><ExportPdfButton targetId="whatif-roadmap-report" filename={`${data?.employee.name ?? "employee"}-what-if-roadmap.pdf`} label="Export Roadmap PDF" /></CardHeader>
        <CardContent>{roadmap.length === 0 ? <p className="py-3 text-sm text-muted-foreground">Add a course to generate Ravi&apos;s learning roadmap.</p> : <ol className="grid gap-3 md:grid-cols-2">{roadmap.map((step, index) => <li key={`${step.label}-${index}`} className="flex gap-3 rounded-xl bg-secondary/60 p-4"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{index + 1}</span><div><p className="font-medium">{step.label}</p><p className="mt-1 text-xs text-muted-foreground">{step.detail}</p></div>{index < roadmap.length - 1 && <ArrowRight className="ml-auto mt-1 hidden size-4 text-muted-foreground md:block" />}</li>)}</ol>}</CardContent>
      </Card>
    </div>
  );
}
