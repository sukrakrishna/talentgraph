"use client";

import { useEffect, useMemo, useState } from "react";
import { Brain, Check, X } from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
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
  const [roleScores, setRoleScores] = useState<{ title: string; score: number }[]>([]);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<{ score: number; feedback: string; verified: boolean } | null>(null);

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
        setRoleScores([]);
        setQuizOpen(false);
        setQuizQuestions([]);
        setQuizResult(null);
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

  async function handleConfirm(skillId: string) {
    setConfirmedSkillIds((prev) => new Set(prev).add(skillId));
    await verifySkill(skillId, "confirmed");
  }

  async function handleNotAccurate(skillId: string) {
    setRemovedSkillIds((prev) => new Set(prev).add(skillId));
    setConfirmedSkillIds((prev) => {
      if (!prev.has(skillId)) return prev;
      const next = new Set(prev);
      next.delete(skillId);
      return next;
    });
    setSelectedSkill(null);
    await verifySkill(skillId, "not_accurate");
  }

  async function verifySkill(skillId: string, action: "confirmed" | "not_accurate") {
    try {
      const response = await fetch("/api/skills/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, skillId, action }),
      });
      const data = (await response.json()) as { roleScores?: { title: string; score: number }[]; error?: string };
      if (!response.ok || data.error) throw new Error(data.error ?? "Verification failed");
      setRoleScores(data.roleScores ?? []);
      setNotice(`Saved ${action === "confirmed" ? "confirmation" : "correction"}; role scores updated.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }

  async function startQuiz() {
    if (!selectedSkill) return;
    setQuizOpen(true);
    setQuizLoading(true);
    setQuizQuestions([]);
    setQuizAnswers({});
    setQuizResult(null);
    try {
      const response = await fetch("/api/quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "generate", employeeId, skillId: selectedSkill.skill_id }) });
      const data = (await response.json()) as { questions?: QuizQuestion[]; error?: string };
      if (!response.ok || data.error) throw new Error(data.error ?? "Quiz generation failed");
      setQuizQuestions(data.questions ?? []);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
      setQuizOpen(false);
    } finally {
      setQuizLoading(false);
    }
  }

  async function submitQuiz() {
    if (!selectedSkill || quizQuestions.some((question) => !quizAnswers[question.id])) return;
    setQuizLoading(true);
    try {
      const response = await fetch("/api/quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "evaluate", employeeId, skillId: selectedSkill.skill_id, questions: quizQuestions, answers: quizAnswers }) });
      const data = (await response.json()) as { score?: number; feedback?: string; verified?: boolean; roleScores?: { title: string; score: number }[]; error?: string };
      if (!response.ok || data.error) throw new Error(data.error ?? "Quiz evaluation failed");
      setQuizResult({ score: data.score ?? 0, feedback: data.feedback ?? "", verified: data.verified ?? false });
      if (data.verified) {
        setSkills((current) => current.map((skill) => skill.skill_id === selectedSkill.skill_id ? { ...skill, source: "verified" } : skill));
        setSelectedSkill((skill) => skill ? { ...skill, source: "verified" } : skill);
        setRoleScores(data.roleScores ?? []);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setQuizLoading(false);
    }
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
                Build skill graph
              </Button>
              {extracting && <p className="text-sm text-muted-foreground">Reading the bio...</p>}
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
                {roleScores.length > 0 && (
                  <div className="border-t border-border pt-3">
                    <p className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">Updated role scores</p>
                    <div className="flex flex-wrap gap-1.5">
                      {roleScores.slice(0, 5).map((role) => <Badge key={role.title} variant="outline">{role.title} {role.score}%</Badge>)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Skill Graph</CardTitle>
              <CardDescription>
                Click a node for details. Blue-grey solid nodes are explicit skills stated in the
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
                  <Badge variant={selectedSkill.source === "verified" ? "default" : selectedSkill.source === "explicit" ? "default" : "secondary"}>
                    {selectedSkill.source === "verified" ? "Verified" : selectedSkill.source === "explicit" ? "Explicit" : "AI-discovered"}
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
                  {selectedSkill.source !== "verified" && <Button size="sm" variant="secondary" onClick={() => void startQuiz()}><Brain className="size-3.5" /> Verify Skill via AI Quiz</Button>}
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
      <Dialog open={quizOpen} onOpenChange={setQuizOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>AI skill verification · {selectedSkill?.name}</DialogTitle><DialogDescription>Answer three quick questions. A score of 80% or higher marks this skill as verified.</DialogDescription></DialogHeader>
          {quizLoading && quizQuestions.length === 0 ? <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Brain className="size-4 animate-pulse text-primary" />Generating your verification quiz...</div> : quizResult ? <div className="grid gap-4"><div className="rounded-2xl border border-primary/30 bg-primary/10 p-6 text-center"><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Quiz score</p><p className="mt-2 font-heading text-5xl font-semibold text-primary">{quizResult.score}%</p><p className="mt-2 text-sm">{quizResult.verified ? "Skill verified and role scores refreshed." : "Keep practicing and try again."}</p></div><p className="text-sm leading-6 text-muted-foreground">{quizResult.feedback}</p></div> : <div className="grid gap-5">{quizQuestions.map((question, index) => <fieldset key={question.id} className="grid gap-3"><legend className="text-sm font-medium">{index + 1}. {question.question}</legend><div className="grid gap-2 sm:grid-cols-2">{question.options.map((option) => <label key={option} className="flex cursor-pointer items-start gap-2 rounded-xl border border-border/70 bg-secondary/40 p-3 text-sm transition-colors hover:border-primary/50"><input type="radio" name={question.id} value={option} checked={quizAnswers[question.id] === option} onChange={() => setQuizAnswers((answers) => ({ ...answers, [question.id]: option }))} className="mt-0.5 accent-[var(--primary)]" />{option}</label>)}</div></fieldset>)}</div>}
          <DialogFooter>{quizResult ? <Button onClick={() => setQuizOpen(false)}>Done</Button> : <Button disabled={quizLoading || quizQuestions.length !== 3 || quizQuestions.some((question) => !quizAnswers[question.id])} onClick={() => void submitQuiz()}>Submit Quiz</Button>}</DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
