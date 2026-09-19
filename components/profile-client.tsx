"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { GraphSkill, SkillGraph } from "@/components/skill-graph";

interface EmployeeSummary {
  id: string;
  name: string;
  job_title: string;
  department: string;
}

interface EmployeeDetail {
  id: string;
  name: string;
  job_title: string;
  department: string;
  bio: string;
}

const DEFAULT_EMPLOYEE_ID = "ravi-k";

export function ProfileClient() {
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [employeeId, setEmployeeId] = useState(DEFAULT_EMPLOYEE_ID);
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [skills, setSkills] = useState<GraphSkill[]>([]);
  const [bio, setBio] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<GraphSkill | null>(null);
  // Confirm/Not-accurate are local, session-only judgments on top of the extracted
  // skills — there's no review column in the schema, so nothing here is persisted.
  const [confirmedSkillIds, setConfirmedSkillIds] = useState<Set<string>>(new Set());
  const [removedSkillIds, setRemovedSkillIds] = useState<Set<string>>(new Set());

  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Loading is derived rather than tracked in its own state: the employee record
  // only ever matches employeeId once its fetch has resolved.
  const loadingEmployee = employee?.id !== employeeId;

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
    fetch(`/api/employees/${employeeId}`)
      .then((res) => res.json())
      .then((data: { employee?: EmployeeDetail; skills?: GraphSkill[]; error?: string }) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setEmployee(data.employee ?? null);
        setBio(data.employee?.bio ?? "");
        // The graph always starts empty — it's populated by clicking "Build skill graph".
        setSkills([]);
        setSelectedSkill(null);
        setConfirmedSkillIds(new Set());
        setRemovedSkillIds(new Set());
        setError(null);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : String(err)));
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

  // "Skills found" / "discovered by AI" are counted from the full extraction
  // response and stay fixed even as skills are locally confirmed or removed below.
  const totalFound = skills.length;
  const discoveredByAI = skills.filter((s) => s.source === "inferred").length;

  const visibleSkills = useMemo(
    () => skills.filter((s) => !removedSkillIds.has(s.skill_id)),
    [skills, removedSkillIds]
  );
  const visibleExplicit = visibleSkills.filter((s) => s.source === "explicit");
  const visibleInferred = visibleSkills.filter((s) => s.source === "inferred");

  const skillNameById = useMemo(
    () => new Map(skills.map((s) => [s.skill_id, s.name])),
    [skills]
  );

  function handleConfirm(skillId: string) {
    setConfirmedSkillIds((prev) => new Set(prev).add(skillId));
  }

  function handleNotAccurate(skillId: string) {
    setRemovedSkillIds((prev) => new Set(prev).add(skillId));
    setConfirmedSkillIds((prev) => {
      if (!prev.has(skillId)) return prev;
      const next = new Set(prev);
      next.delete(skillId);
      return next;
    });
    setSelectedSkill(null);
  }

  const reviewedCount = confirmedSkillIds.size + removedSkillIds.size;
  const reviewProgressPct = totalFound > 0 ? Math.round((reviewedCount / totalFound) * 100) : 0;

  const progressItems: { label: string; dotClassName?: string }[] = [
    { label: `${totalFound} skills found` },
    { label: `${discoveredByAI} discovered by AI`, dotClassName: "bg-[#c6f432]" },
    { label: `${confirmedSkillIds.size} confirmed` },
    { label: `${removedSkillIds.size} marked not accurate` },
  ];

  async function handleExtract() {
    setExtracting(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, bio }),
      });
      const data: { skills?: GraphSkill[]; error?: string } = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Extraction failed");
      }
      setSkills(data.skills ?? []);
      setSelectedSkill(null);
      setConfirmedSkillIds(new Set());
      setRemovedSkillIds(new Set());
      setNotice(
        `Extracted ${data.skills?.length ?? 0} skills (${
          data.skills?.filter((s) => s.source === "explicit").length ?? 0
        } explicit, ${data.skills?.filter((s) => s.source === "inferred").length ?? 0} inferred).`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Write or edit a bio, extract skills with AI, and see the skill graph update live.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Employee</CardTitle>
              <CardDescription>Choose who this profile belongs to.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
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
              {!loadingEmployee && employee && (
                <div className="text-sm text-muted-foreground">
                  {employee.job_title} · {employee.department}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bio</CardTitle>
              <CardDescription>
                Describe the work this person does. Be concrete — specific tools, tasks, and
                outcomes extract better skills.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={loadingEmployee}
                rows={6}
                placeholder="e.g. Built an internal dashboard in React with charts for ticket trends..."
              />
              <Button onClick={handleExtract} disabled={extracting || loadingEmployee || !bio.trim()}>
                {extracting ? "Building skill graph..." : "Build skill graph"}
              </Button>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {notice && !error && <p className="text-sm text-muted-foreground">{notice}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skills ({visibleSkills.length})</CardTitle>
              <CardDescription>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#7dd3fc" }} />
                  {visibleExplicit.length} explicit
                </span>
                <span className="mx-2">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#c6f432" }} />
                  {visibleInferred.length} inferred
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {visibleSkills.map((s) => (
                <Badge
                  key={s.skill_id}
                  variant={s.source === "explicit" ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => setSelectedSkill(s)}
                >
                  {confirmedSkillIds.has(s.skill_id) && <Check className="size-3" />}
                  {s.name}
                </Badge>
              ))}
              {visibleSkills.length === 0 && !loadingEmployee && (
                <p className="text-sm text-muted-foreground">No skills yet — extract some from the bio.</p>
              )}
            </CardContent>
          </Card>

          {totalFound > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Progress</CardTitle>
                <CardDescription>Review progress and a breakdown computed from the extracted skills.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Progress value={reviewProgressPct}>
                  <div className="flex w-full justify-between text-sm">
                    <span>Reviewed</span>
                    <span className="text-muted-foreground tabular-nums">
                      {reviewedCount}/{totalFound}
                    </span>
                  </div>
                </Progress>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {progressItems.map((item) => (
                    <li key={item.label} className="flex items-center gap-1.5 text-muted-foreground">
                      {item.dotClassName && (
                        <span className={`h-2 w-2 rounded-full ${item.dotClassName}`} />
                      )}
                      {item.label}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Skill Graph</CardTitle>
              <CardDescription>
                Click a node for details. Sky-blue solid nodes are explicit skills stated in the
                bio; glowing lime nodes with dashed links are AI-inferred.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SkillGraph
                employeeName={employee?.name ?? ""}
                skills={skills}
                hiddenSkillIds={removedSkillIds}
                onSelectSkill={setSelectedSkill}
              />
            </CardContent>
          </Card>

          {selectedSkill && (
            <Card>
              <CardHeader>
                <CardTitle>{selectedSkill.name}</CardTitle>
                <CardDescription>{selectedSkill.category}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={selectedSkill.source === "explicit" ? "default" : "secondary"}>
                    {selectedSkill.source === "explicit" ? "Explicit" : "AI-discovered"}
                  </Badge>
                  <span className="text-muted-foreground">
                    Proficiency {selectedSkill.proficiency}/3
                  </span>
                </div>
                <p className="text-muted-foreground">
                  Evidence: <span className="text-foreground">&ldquo;{selectedSkill.evidence}&rdquo;</span>
                </p>
                {selectedSkill.linked_to.length > 0 && (
                  <p className="text-muted-foreground">
                    Linked to:{" "}
                    <span className="text-foreground">
                      {selectedSkill.linked_to
                        .map((id) => skillNameById.get(id) ?? id)
                        .join(", ")}
                    </span>
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant={confirmedSkillIds.has(selectedSkill.skill_id) ? "secondary" : "default"}
                    onClick={() => handleConfirm(selectedSkill.skill_id)}
                  >
                    <Check className="size-3.5" />
                    {confirmedSkillIds.has(selectedSkill.skill_id) ? "Confirmed" : "Confirm"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleNotAccurate(selectedSkill.skill_id)}
                  >
                    <X className="size-3.5" />
                    Not accurate
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
