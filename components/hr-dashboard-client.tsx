"use client";

import { useEffect, useState } from "react";
import { BriefcaseBusiness, Clock3, Coins, ClipboardList, Sparkles, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ExportPdfButton } from "@/components/ExportPdfButton";

interface HrData {
  kpis: {
    totalInternalMobilityRate: number;
    hiddenSkillMatchCount: number;
    skillsGapCoverage: number;
    avgTimeToFillDays: number;
  };
  heatmap: { departments: string[]; categories: string[]; rows: { department: string; values: { category: string; coverage: number }[] }[] };
  hiddenTalent: {
    employeeId: string;
    employeeName: string;
    currentDepartment: string;
    roleId: string;
    roleTitle: string;
    roleDepartment: string;
    matchedSkills: string[];
  }[];
  costAvoidance: { rolesFilledInternally: number; avgExternalSalaryLakhs: number; agencyFeePercent: number };
  auditLogs?: { id: string; employee_id: string; action: string; skillName: string; created_at: string }[];
}

const CORAL = "#FF7A6B";
const GREEN = "#C6F432";

function heatColor(coverage: number): string {
  if (coverage < 15) return CORAL;
  const intensity = Math.min(0.82, 0.12 + coverage / 140);
  return `color-mix(in srgb, ${GREEN} ${Math.round(intensity * 100)}%, var(--secondary))`;
}

function KpiCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Users }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3">
        <div><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className="mt-3 font-heading text-3xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>
        <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary"><Icon className="size-4" /></span>
      </CardContent>
    </Card>
  );
}

export function HrDashboardClient() {
  const [data, setData] = useState<HrData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rolesFilled, setRolesFilled] = useState(0);
  const [salary, setSalary] = useState(8);
  const [feePercent, setFeePercent] = useState(20);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<HrData["auditLogs"]>([]);

  async function openAuditTrail() {
    const response = await fetch("/api/skills/verify");
    const result = (await response.json()) as { logs?: HrData["auditLogs"] };
    setAuditLogs(result.logs ?? []);
    setAuditOpen(true);
  }

  useEffect(() => {
    fetch("/api/hr")
      .then(async (response) => {
        const result = (await response.json()) as HrData & { error?: string };
        if (!response.ok || result.error) throw new Error(result.error ?? "Unable to load HR metrics");
        setData(result);
        setRolesFilled(result.costAvoidance.rolesFilledInternally);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : String(reason));
        setLoading(false);
      });
  }, []);

  const costAvoided = rolesFilled * salary * (feePercent / 100);

  return (
    <div id="hr-executive-report" className="pdf-report mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-xs font-medium uppercase tracking-[0.22em] text-primary">People intelligence</p><h1 className="font-heading text-4xl font-semibold tracking-tight">HR Dashboard</h1><p className="mt-2 text-sm text-muted-foreground">A clear view of internal mobility, capability coverage, and talent hiding in plain sight.</p></div><div className="flex flex-wrap gap-2"><ExportPdfButton targetId="hr-executive-report" filename="talentgraph-hr-executive-report.pdf" /><Button variant="outline" onClick={() => void openAuditTrail()}><ClipboardList /> Audit Trail</Button></div></div>
      {loading && <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">Loading workforce metrics...</CardContent></Card>}
      {error && <Card><CardContent className="py-16 text-center text-sm text-destructive">{error}</CardContent></Card>}
      {data && <>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Internal mobility rate" value={`${data.kpis.totalInternalMobilityRate}%`} detail="employees with an outside-role match" icon={Users} />
          <KpiCard label="Hidden skill matches" value={`${data.kpis.hiddenSkillMatchCount}`} detail="cross-department opportunities" icon={Sparkles} />
          <KpiCard label="Skills gap coverage" value={`${data.kpis.skillsGapCoverage}%`} detail="role taxonomy represented internally" icon={BriefcaseBusiness} />
          <KpiCard label="Avg. time to fill" value={`${data.kpis.avgTimeToFillDays}d`} detail="estimated internal-first baseline" icon={Clock3} />
        </section>

        <Card>
          <CardHeader><CardTitle>Department skill coverage</CardTitle><p className="text-sm text-muted-foreground">Distinct skills represented in each department&apos;s people, by taxonomy category.</p></CardHeader>
          <CardContent className="overflow-x-auto"><table className="w-full min-w-[850px] border-separate border-spacing-1 text-sm"><thead><tr><th className="w-40 px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Department</th>{data.heatmap.categories.map((category) => <th key={category} className="max-w-24 px-2 py-2 text-center text-[11px] font-medium leading-tight text-muted-foreground">{category}</th>)}</tr></thead><tbody>{data.heatmap.rows.map((row) => <tr key={row.department}><th className="px-3 py-3 text-left font-medium">{row.department}</th>{row.values.map((cell) => <td key={cell.category} className="rounded-md px-2 py-3 text-center font-semibold tabular-nums" style={{ backgroundColor: heatColor(cell.coverage), color: cell.coverage < 15 ? "#0d1014" : undefined }}>{cell.coverage}%</td>)}</tr>)}</tbody></table><div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-2"><i className="size-3 rounded-sm" style={{ backgroundColor: CORAL }} />under 15%</span><span className="flex items-center gap-2"><i className="size-3 rounded-sm bg-primary" />stronger coverage</span></div></CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <Card><CardHeader><CardTitle>Hidden talent</CardTitle><p className="text-sm text-muted-foreground">People whose current skills point toward roles outside their home department.</p></CardHeader><CardContent className="grid gap-3">{data.hiddenTalent.length === 0 ? <p className="py-8 text-sm text-muted-foreground">No cross-department matches yet.</p> : data.hiddenTalent.map((match, index) => <div key={`${match.employeeId}-${match.roleId}-${index}`} className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{match.employeeName}</p><Badge variant="outline">{match.currentDepartment}</Badge><span className="text-muted-foreground">→</span><Badge variant="secondary">{match.roleTitle}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{match.roleDepartment} opportunity</p></div><div className="flex flex-wrap gap-1.5 sm:max-w-[45%] sm:justify-end">{match.matchedSkills.map((skill) => <Badge key={skill} className="bg-primary text-primary-foreground">{skill}</Badge>)}</div></div>)}</CardContent></Card>

          <Card className="border-primary/30 bg-[linear-gradient(145deg,rgba(198,244,50,0.09),transparent_55%)]"><CardHeader><CardTitle>Cost avoidance calculator</CardTitle><p className="text-sm text-muted-foreground">Model the agency fee avoided by filling roles internally.</p></CardHeader><CardContent className="grid gap-4"><label className="grid gap-2 text-sm font-medium">Roles filled internally<Input type="number" min="0" value={rolesFilled} onChange={(event) => setRolesFilled(Number(event.target.value) || 0)} /></label><label className="grid gap-2 text-sm font-medium">Avg. external salary <span className="font-normal text-muted-foreground">(Rs lakhs)</span><Input type="number" min="0" value={salary} onChange={(event) => setSalary(Number(event.target.value) || 0)} /></label><label className="grid gap-2 text-sm font-medium">Agency fee <span className="font-normal text-muted-foreground">(%)</span><Input type="number" min="0" max="100" value={feePercent} onChange={(event) => setFeePercent(Number(event.target.value) || 0)} /></label><div className="mt-2 flex items-end justify-between border-t border-border pt-4"><div><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Total cost avoided</p><p className="mt-1 font-heading text-4xl font-semibold text-primary">Rs {costAvoided.toFixed(1)}L</p></div><Coins className="size-7 text-primary" /></div><p className="text-xs text-muted-foreground">{rolesFilled} roles × Rs {salary}L × {feePercent}% agency fee</p></CardContent></Card>
        </div>
      </>}
      {auditOpen && <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center"><Card className="max-h-[80vh] w-full max-w-xl overflow-hidden"><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Audit Trail</CardTitle><p className="text-sm text-muted-foreground">Recent skill verification events.</p></div><Button variant="ghost" size="icon" onClick={() => setAuditOpen(false)} aria-label="Close audit trail"><X /></Button></CardHeader><CardContent className="max-h-[60vh] overflow-y-auto"><div className="grid gap-2">{auditLogs?.length ? auditLogs.map((log) => <div key={log.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"><div><p className="font-medium">{log.skillName}</p><p className="text-xs text-muted-foreground">{log.employee_id} · {new Date(log.created_at).toLocaleString()}</p></div><Badge variant={log.action === "confirmed" ? "default" : "destructive"}>{log.action === "confirmed" ? "Confirmed" : "Not accurate"}</Badge></div>) : <p className="py-8 text-sm text-muted-foreground">No verification events yet.</p>}</div></CardContent></Card></div>}
    </div>
  );
}
