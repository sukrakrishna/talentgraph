"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bot, LoaderCircle, Send, UserRound, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface EmployeeSummary {
  id: string;
  name: string;
  job_title: string;
  department: string;
}

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

const DEFAULT_EMPLOYEE_ID = "ravi-k";
const SUGGESTIONS = [
  "What skills am I missing for Data Analyst?",
  "How can I improve my match score for Operations Analytics?",
  "What roles am I best suited for right now?",
];

export function AssistantClient() {
  const searchParams = useSearchParams();
  const presetPrompt = searchParams.get("prompt") ?? "";
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [employeeId, setEmployeeId] = useState(DEFAULT_EMPLOYEE_ID);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState(presetPrompt);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latencyLabel, setLatencyLabel] = useState<string | null>(null);
  const activeEmployee = useMemo(
    () => employees.find((employee) => employee.id === employeeId) ?? {
      id: DEFAULT_EMPLOYEE_ID,
      name: "Ravi K.",
      job_title: "Support Engineer",
      department: "Support",
    },
    [employees, employeeId]
  );

  useEffect(() => {
    fetch("/api/employees")
      .then(async (response) => {
        const data = (await response.json()) as { employees?: EmployeeSummary[]; error?: string };
        if (!response.ok || data.error) throw new Error(data.error ?? "Unable to load employees");
        setEmployees(data.employees ?? []);
        setLoadingEmployees(false);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : String(reason));
        setLoadingEmployees(false);
      });
  }, []);

  function changeEmployee(nextEmployeeId: string) {
    setEmployeeId(nextEmployeeId);
    setMessages([]);
    setError(null);
  }

  async function submitMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed || loading) return;
    setDraft("");
    setError(null);
    setMessages((current) => [...current, { id: Date.now(), role: "user", content: trimmed }]);
    setLoading(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, employeeId }),
      });
      const data = (await response.json()) as { answer?: string; error?: string; cacheHit?: boolean; latencyMs?: number; safe?: boolean };
      if (data.safe === false) {
        setMessages((current) => [...current, { id: Date.now() + 1, role: "assistant", content: data.error ?? "Security Guardrail Flagged: Adversarial prompt pattern detected." }]);
        return;
      }
      if (!response.ok || data.error) throw new Error(data.error ?? "Assistant unavailable");
      setMessages((current) => [...current, { id: Date.now() + 1, role: "assistant", content: data.answer ?? "I could not find an answer in this talent graph." }]);
      setLatencyLabel(`${data.latencyMs ?? 0}ms${data.cacheHit ? " · cache hit" : ""}`);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage(draft);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 lg:px-8">
      <div className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-xs font-medium uppercase tracking-[0.22em] text-primary">Grounded talent graph</p><h1 className="font-heading text-4xl font-semibold tracking-tight">Assistant</h1><p className="mt-2 text-sm text-muted-foreground">Ask about career mobility, role fit, and the next skill gap to close.</p></div><div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"><span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Bot className="size-5" /></span><div><p className="text-xs text-muted-foreground">Active context</p><div className="flex items-center gap-2"><select aria-label="Active employee" value={employeeId} onChange={(event) => changeEmployee(event.target.value)} disabled={loadingEmployees} className="max-w-44 bg-transparent text-sm font-medium outline-none"><option value={DEFAULT_EMPLOYEE_ID}>Ravi K. · Support Engineer</option>{employees.filter((employee) => employee.id !== DEFAULT_EMPLOYEE_ID).map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.job_title}</option>)}</select><Badge variant="outline">{activeEmployee.department}</Badge></div></div></div></div>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]"><aside className="flex flex-col gap-4"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Try asking</p><div className="mt-3 flex flex-col gap-2">{SUGGESTIONS.map((suggestion) => <button key={suggestion} type="button" onClick={() => void submitMessage(suggestion)} disabled={loading} className="rounded-xl border border-border bg-card px-3 py-3 text-left text-sm leading-snug transition-colors hover:border-primary/70 hover:bg-secondary disabled:opacity-50">{suggestion}</button>)}</div></div><div className="rounded-xl border border-border bg-secondary/60 p-4"><p className="text-xs font-medium text-foreground">Context boundary</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Answers are limited to {activeEmployee.name}&apos;s profile, skills, role scores, and skill gaps.</p></div></aside>

        <Card className="min-h-[560px] overflow-hidden"><CardContent className="flex h-full flex-col p-0"><div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-7">{messages.length === 0 && <div className="flex min-h-[390px] flex-col items-center justify-center text-center"><span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Bot className="size-7" /></span><h2 className="mt-5 font-heading text-2xl font-medium">Ask me about {activeEmployee.name}</h2><p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">I can explain current role matches, missing skills, and grounded ways to improve career mobility.</p></div>}{messages.map((message) => <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`flex max-w-[min(80%,620px)] gap-3 rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === "user" ? "flex-row-reverse bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}><span className="mt-0.5 shrink-0">{message.role === "user" ? <UserRound className="size-4" /> : <Bot className="size-4 text-primary" />}</span><p>{message.content}</p></div></div>)}{loading && <div className="flex gap-3"><div className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin text-primary" />Thinking from the talent graph...</div></div>}</div><div className="border-t border-border p-4 sm:p-5"><form onSubmit={handleSubmit} className="flex items-end gap-3"><Textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask about a role match or skill gap..." className="min-h-12 resize-none bg-background" rows={2} /><Button type="submit" size="icon-lg" disabled={loading || !draft.trim()} aria-label="Send message"><Send /></Button></form>{error && <p className="mt-2 text-xs text-destructive">{error}</p>}<div className="mt-2 flex items-center gap-2"><p className="text-[11px] text-muted-foreground">Grounded answers only · TalentGraph Assistant</p>{latencyLabel && <Badge variant="outline" className="gap-1 font-mono text-[10px]"><Zap className="size-3 text-primary" />{latencyLabel}</Badge>}</div></div></CardContent></Card></div>
    </div>
  );
}
