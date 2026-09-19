"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Coins, Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface TeamMember {
  id: string;
  name: string;
  jobTitle: string;
  department: string;
  matchedSkills: { id: string; name: string }[];
}

interface TeamResult {
  requiredSkills: { id: string; name: string }[];
  members: TeamMember[];
  coverage: { covered: number; total: number };
  missingSkills: { id: string; name: string }[];
  costAvoidedLakhs: number;
  assumptions: { avgExternalSalaryLakhs: number; agencyFeePercent: number };
}

const DEFAULT_BRIEF = "Need a team to build an ops dashboard with SQL and React";
const CORAL = "#FF7A6B";

export function TeamBuilderClient() {
  const [brief, setBrief] = useState(DEFAULT_BRIEF);
  const [result, setResult] = useState<TeamResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buildTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/teambuilder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      const data = (await response.json()) as TeamResult & { error?: string };
      if (!response.ok || data.error) throw new Error(data.error ?? "Unable to build team");
      setResult(data);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
    }
  }

  const coveragePercent = result && result.coverage.total > 0 ? (result.coverage.covered / result.coverage.total) * 100 : 0;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:px-8">
      <div><p className="mb-2 text-xs font-medium uppercase tracking-[0.22em] text-primary">Internal team design</p><h1 className="font-heading text-4xl font-semibold tracking-tight">Build a team from inside</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Describe the outcome. TalentGraph maps the brief to skills and assembles the strongest three-person starting team.</p></div>

      <Card className="border-primary/30 bg-[linear-gradient(145deg,rgba(198,244,50,0.09),transparent_55%)]"><CardContent className="p-6"><form onSubmit={buildTeam} className="grid gap-4"><label htmlFor="team-brief" className="text-sm font-medium">What does the team need to do?</label><Textarea id="team-brief" value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="Need a team to build an ops dashboard with SQL and React" className="min-h-28 resize-y bg-background/50" /><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">The brief is mapped against the internal skill taxonomy.</p><Button type="submit" disabled={loading || brief.trim().length < 3}>{loading ? "Finding the team..." : <><Search /> Find my team</>}</Button></div></form></CardContent></Card>

      {error && <Card><CardContent className="py-12 text-center text-sm text-destructive">{error}</CardContent></Card>}
      {result && <>
        <div className="grid gap-4 sm:grid-cols-3"><Card><CardContent><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Required skills</p><p className="mt-2 font-heading text-3xl font-semibold">{result.coverage.total}</p><p className="mt-1 text-xs text-muted-foreground">mapped from the brief</p></CardContent></Card><Card><CardContent><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Team coverage</p><p className="mt-2 font-heading text-3xl font-semibold">{result.coverage.covered} <span className="text-lg text-muted-foreground">of {result.coverage.total}</span></p><p className="mt-1 text-xs text-muted-foreground">{Math.round(coveragePercent)}% covered</p></CardContent></Card><Card className="border-primary/30"><CardContent><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Agency cost saved</p><p className="mt-2 font-heading text-3xl font-semibold text-primary">Rs {result.costAvoidedLakhs.toFixed(1)}L</p><p className="mt-1 text-xs text-muted-foreground">3 roles × Rs {result.assumptions.avgExternalSalaryLakhs}L × {result.assumptions.agencyFeePercent}%</p></CardContent></Card></div>

        <Card><CardHeader className="flex-row items-end justify-between gap-4"><div><CardTitle>Your internal team</CardTitle><p className="mt-1 text-sm text-muted-foreground">Greedy selection: each person covers the most remaining brief skills.</p></div><Badge variant="secondary"><Users className="size-3" /> 3 members</Badge></CardHeader><CardContent className="grid gap-4 md:grid-cols-3">{result.members.map((member, index) => <div key={member.id} className="interactive-lift relative flex flex-col gap-4 rounded-xl border border-border/80 p-5"><span className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-primary">0{index + 1}</span><div className="pr-8"><h2 className="font-heading text-xl font-medium">{member.name}</h2><p className="mt-1 text-xs text-muted-foreground">{member.jobTitle} · {member.department}</p></div><div className="flex flex-wrap gap-1.5">{member.matchedSkills.length > 0 ? member.matchedSkills.map((skill) => <Badge key={skill.id} className="bg-primary text-primary-foreground">{skill.name}</Badge>) : <span className="text-xs text-muted-foreground">No direct brief skill match</span>}</div></div>)}</CardContent></Card>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]"><Card><CardHeader><CardTitle>Coverage map</CardTitle><p className="text-sm text-muted-foreground">The selected team covers {result.coverage.covered} of {result.coverage.total} mapped skills.</p></CardHeader><CardContent><div className="h-3 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${coveragePercent}%` }} /></div><div className="mt-4 flex flex-wrap gap-2">{result.requiredSkills.map((skill) => <Badge key={skill.id} variant={result.missingSkills.some((missing) => missing.id === skill.id) ? "destructive" : "secondary"}>{skill.name}</Badge>)}</div></CardContent></Card><Card><CardHeader><CardTitle>Still uncovered</CardTitle></CardHeader><CardContent>{result.missingSkills.length > 0 ? <div className="flex flex-wrap gap-2">{result.missingSkills.map((skill) => <Badge key={skill.id} style={{ backgroundColor: CORAL, color: "#0d1014" }}>{skill.name}</Badge>)}</div> : <p className="flex items-center gap-2 text-sm font-medium text-primary">Complete skill coverage <ArrowRight className="size-4" /></p>}<div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground"><Coins className="size-4 text-primary" />Agency fee avoided by staffing internally.</div></CardContent></Card></div>
      </>}
    </div>
  );
}
