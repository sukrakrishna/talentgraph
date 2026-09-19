"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Send, Sparkles } from "lucide-react";

interface EmployeeSummary {
  id: string;
  name: string;
  job_title: string;
  department: string;
}

interface RoleMatch {
  role_id: string;
  title: string;
  team: string;
  department: string;
  score: number;
  requiredCovered: number;
  requiredTotal: number;
  preferredCovered: number;
  preferredTotal: number;
  matchedSkills: string[];
  missingRequiredSkills: string[];
  missingPreferredSkills: string[];
}

const DEFAULT_EMPLOYEE_ID = "ravi-k";
const EXPLAIN_COUNT = 5;
const COLOR_MATCHED = "#C6F432";
const COLOR_MISSING = "#FF7A6B";

function ChipRow({ label, skills, color }: { label: string; skills: string[]; color: string }) {
  if (skills.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}:</span>
      {skills.map((skill) => (
        <Badge
          key={skill}
          className="border-transparent"
          style={{ backgroundColor: color, color: "#0d1014" }}
        >
          {skill}
        </Badge>
      ))}
    </div>
  );
}

function RoleCard({
  role,
  isTop,
  isSelected,
  explanation,
  onSelect,
  onApply,
}: {
  role: RoleMatch;
  isTop: boolean;
  isSelected: boolean;
  explanation: string | null;
  onSelect: () => void;
  onApply: () => void;
}) {
  return (
    <Card
      onClick={onSelect}
      className={cn(
        "interactive-lift cursor-pointer",
        isSelected ? "border-primary shadow-[0_0_24px_rgba(198,244,50,0.16)]" : "hover:border-muted-foreground/40"
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{role.title}</CardTitle>
            <CardDescription>{role.team}</CardDescription>
          </div>
          <span
            className={cn("text-lg font-semibold tabular-nums", isTop && "text-primary")}
          >
            {role.score}%
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Progress
          value={role.score}
          className={!isTop ? "[&_[data-slot=progress-indicator]]:bg-[#94a3b8]" : undefined}
        />
        <ChipRow label="Matched" skills={role.matchedSkills} color={COLOR_MATCHED} />
        <ChipRow label="Missing (required)" skills={role.missingRequiredSkills} color={COLOR_MISSING} />
        <ChipRow label="Missing (preferred)" skills={role.missingPreferredSkills} color={COLOR_MISSING} />
        {explanation && <p className="text-sm text-muted-foreground">{explanation}</p>}
        <Button size="sm" className="mt-1 self-start" onClick={(event) => { event.stopPropagation(); onApply(); }}>
          <Sparkles className="size-3.5" /> Apply Internally
        </Button>
      </CardContent>
    </Card>
  );
}

export function RolesClient() {
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [employeeId, setEmployeeId] = useState(DEFAULT_EMPLOYEE_ID);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const [roles, setRoles] = useState<RoleMatch[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [explanations, setExplanations] = useState<Map<string, string>>(new Map());
  const [explaining, setExplaining] = useState(false);

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [pitchRole, setPitchRole] = useState<RoleMatch | null>(null);
  const [pitch, setPitch] = useState<string[]>([]);
  const [pitchLoading, setPitchLoading] = useState(false);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);

  // Reset the roles/explanations state during render when the employee changes,
  // rather than in an effect — see https://react.dev/learn/you-might-not-need-an-effect
  const [seenEmployeeId, setSeenEmployeeId] = useState(employeeId);
  if (seenEmployeeId !== employeeId) {
    setSeenEmployeeId(employeeId);
    setLoadingRoles(true);
    setError(null);
    setExplanations(new Map());
    setExplaining(false);
    setSelectedRoleId(null);
    setPitchRole(null);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/employees")
      .then((res) => res.json())
      .then((data: { employees?: EmployeeSummary[]; error?: string }) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setEmployees(data.employees ?? []);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : String(err)))
      .finally(() => !cancelled && setLoadingEmployees(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/match?employeeId=${encodeURIComponent(employeeId)}`)
      .then((res) => res.json())
      .then((data: { roles?: RoleMatch[]; error?: string }) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        const fetchedRoles = data.roles ?? [];
        setRoles(fetchedRoles);
        setSelectedRoleId(fetchedRoles[0]?.role_id ?? null);

        const topRoles = fetchedRoles.slice(0, EXPLAIN_COUNT);
        if (topRoles.length > 0) {
          setExplaining(true);
          fetch("/api/explain", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roles: topRoles }),
          })
            .then((res) => res.json())
            .then((explainData: { explanations?: { role_id: string; sentence: string }[] }) => {
              if (cancelled) return;
              setExplanations(
                new Map((explainData.explanations ?? []).map((e) => [e.role_id, e.sentence]))
              );
            })
            .catch(() => {
              // Explanations are a nice-to-have; leave cards without one on failure.
            })
            .finally(() => !cancelled && setExplaining(false));
        }
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : String(err)))
      .finally(() => !cancelled && setLoadingRoles(false));

    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  const employeesByDept = useMemo(() => {
    const groups = new Map<string, EmployeeSummary[]>();
    for (const emp of employees) {
      const list = groups.get(emp.department) ?? [];
      list.push(emp);
      groups.set(emp.department, list);
    }
    return [...groups.entries()];
  }, [employees]);

  const selectedRole = roles.find((r) => r.role_id === selectedRoleId) ?? null;
  const requiredRatio = selectedRole && selectedRole.requiredTotal > 0
    ? selectedRole.requiredCovered / selectedRole.requiredTotal
    : 1;
  const preferredRatio = selectedRole && selectedRole.preferredTotal > 0
    ? selectedRole.preferredCovered / selectedRole.preferredTotal
    : 1;

  function explanationFor(role: RoleMatch, rank: number): string | null {
    if (rank >= EXPLAIN_COUNT) return null;
    const sentence = explanations.get(role.role_id);
    if (sentence) return sentence;
    if (explaining) return "Generating explanation...";
    return null;
  }

  async function generatePitch(role: RoleMatch) {
    setPitchRole(role);
    setPitch([]);
    setApplicationSubmitted(false);
    setPitchLoading(true);
    try {
      const response = await fetch("/api/pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, roleId: role.role_id }),
      });
      const data = (await response.json()) as { paragraphs?: string[]; error?: string };
      if (!response.ok || data.error) throw new Error(data.error ?? "Pitch generation failed");
      setPitch(data.paragraphs ?? []);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setPitchLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
        <p className="text-sm text-muted-foreground">
          See how an employee&apos;s current skills stack up against every open role.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Employee</CardTitle>
              <CardDescription>Choose who to match against every role.</CardDescription>
            </CardHeader>
            <CardContent>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={loadingEmployees}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                {employeesByDept.map(([dept, list]) => (
                  <optgroup key={dept} label={dept}>
                    {list.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} — {emp.job_title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How the score works</CardTitle>
              <CardDescription>
                {selectedRole
                  ? `${selectedRole.title} · ${selectedRole.team}`
                  : "Select a role to see its breakdown."}
              </CardDescription>
            </CardHeader>
            {selectedRole && (
              <CardContent className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Required coverage</span>
                  <span className="font-medium tabular-nums">
                    {selectedRole.requiredCovered}/{selectedRole.requiredTotal}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Preferred coverage</span>
                  <span className="font-medium tabular-nums">
                    {selectedRole.preferredCovered}/{selectedRole.preferredTotal}
                  </span>
                </div>
                <Separator />
                <p className="text-muted-foreground">
                  Score = round(100 × (0.7 × required + 0.3 × preferred))
                  <br />
                  = round(100 × (0.7 × {requiredRatio.toFixed(2)} + 0.3 × {preferredRatio.toFixed(2)}))
                  <br />= <span className="font-medium text-foreground">{selectedRole.score}%</span>
                </p>
                <Link
                  href="/what-if"
                  className="text-sm text-primary underline underline-offset-4"
                >
                  See what would move this score →
                </Link>
              </CardContent>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Roles ({roles.length})</h2>
            {loadingRoles && <span className="text-sm text-muted-foreground">Scoring roles...</span>}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!loadingRoles &&
            !error &&
            roles.map((role, index) => (
              <RoleCard
                key={role.role_id}
                role={role}
                isTop={index === 0}
                isSelected={role.role_id === selectedRoleId}
                explanation={explanationFor(role, index)}
                onSelect={() => setSelectedRoleId(role.role_id)}
                onApply={() => void generatePitch(role)}
              />
            ))}
        </div>
      </div>
      <Dialog open={pitchRole !== null} onOpenChange={(open) => !open && setPitchRole(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Internal mobility pitch · {pitchRole?.title}</DialogTitle>
            <DialogDescription>AI-crafted from the selected employee&apos;s current skills, match score, and gap bridge plan.</DialogDescription>
          </DialogHeader>
          {pitchLoading ? <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Sparkles className="size-4 animate-pulse text-primary" />Writing a grounded transfer pitch...</div> : <div className="grid gap-4">{pitch.map((paragraph, index) => <p key={index} className="rounded-xl border border-border/70 bg-secondary/40 p-4 text-sm leading-7">{paragraph}</p>)}</div>}
          <DialogFooter>
            <Button variant="outline" disabled={pitch.length === 0} onClick={() => void navigator.clipboard?.writeText(pitch.join("\n\n"))}><Copy /> Copy Pitch</Button>
            <Button disabled={pitchLoading || pitch.length === 0} onClick={() => setApplicationSubmitted(true)}><Send /> {applicationSubmitted ? "Application Submitted" : "Submit Application"}</Button>
          </DialogFooter>
          {applicationSubmitted && <p className="text-sm font-medium text-primary">Application submitted to the hiring team.</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
