"use client";

import { useTheme } from "next-themes";
import { BarChart3, Gauge, LineChart as LineChartIcon, PieChart as PieChartIcon, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Line,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface AnalyticsData {
  metrics: { label: string; value: string; trend: string; positive: boolean }[];
  skillDistribution: { name: string; value: number }[];
  departmentReadiness: { department: string; readiness: number }[];
  growthTrend: { stage: string; readiness: number }[];
  skillUtilization: number;
}

const CHART_COLORS = ["#C6F432", "#7DD3FC", "#FF7A6B", "#C084FC", "#FBBF24"];

function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme !== "light";
  return {
    text: dark ? "#9AA7B5" : "#71717A",
    grid: dark ? "#262F3A" : "#E4E4E7",
    tooltipBackground: dark ? "#151A21" : "#FFFFFF",
    tooltipBorder: dark ? "#262F3A" : "#E4E4E7",
    accent: "#C6F432",
    secondary: dark ? "#1C232C" : "#F4F4F5",
  };
}

const tooltipStyle = (theme: ReturnType<typeof useChartTheme>) => ({
  contentStyle: { backgroundColor: theme.tooltipBackground, border: `1px solid ${theme.tooltipBorder}`, borderRadius: 8, color: darkText(theme) },
  itemStyle: { color: darkText(theme) },
  labelStyle: { color: darkText(theme), fontWeight: 600 },
});

function darkText(theme: ReturnType<typeof useChartTheme>) {
  return theme.tooltipBackground === "#FFFFFF" ? "#09090B" : "#E8ECF1";
}

export function MetricBadgesCard({ metrics }: { metrics: AnalyticsData["metrics"] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label}>
          <CardContent className="flex items-start justify-between gap-3">
            <div><p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{metric.label}</p><p className="mt-2 font-heading text-2xl font-semibold">{metric.value}</p></div>
            <Badge className={metric.positive ? "bg-primary text-primary-foreground" : "bg-destructive text-white"}>{metric.trend}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SkillDistributionChart({ data }: { data: AnalyticsData["skillDistribution"] }) {
  const theme = useChartTheme();
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><PieChartIcon className="size-4 text-primary" />Skill distribution</CardTitle><p className="text-sm text-muted-foreground">Where internal capability is concentrated across the taxonomy.</p></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={94} paddingAngle={3} stroke="none">{data.map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Pie><Tooltip {...tooltipStyle(theme)} /></PieChart></ResponsiveContainer></div><div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">{data.map((entry, index) => <span key={entry.name} className="flex items-center gap-1.5"><i className="size-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />{entry.name} {entry.value}</span>)}</div></CardContent></Card>;
}

export function DepartmentReadinessChart({ data }: { data: AnalyticsData["departmentReadiness"] }) {
  const theme = useChartTheme();
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="size-4 text-primary" />Department readiness</CardTitle><p className="text-sm text-muted-foreground">Average best-role match by department.</p></CardHeader><CardContent><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 48 }}><XAxis dataKey="department" angle={-28} textAnchor="end" height={60} tick={{ fill: theme.text, fontSize: 11 }} axisLine={{ stroke: theme.grid }} tickLine={false} /><YAxis domain={[0, 100]} tick={{ fill: theme.text, fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip {...tooltipStyle(theme)} formatter={(value) => [`${value}%`, "Readiness"]} /><Bar dataKey="readiness" fill={theme.accent} radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>;
}

export function GrowthTrendChart({ data }: { data: AnalyticsData["growthTrend"] }) {
  const theme = useChartTheme();
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><LineChartIcon className="size-4 text-primary" />Upskilling & growth trend</CardTitle><p className="text-sm text-muted-foreground">Modeled readiness trajectory from discovery to internal mobility.</p></CardHeader><CardContent><div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 12, right: 12, left: -18, bottom: 8 }}><defs><linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={theme.accent} stopOpacity={0.35} /><stop offset="95%" stopColor={theme.accent} stopOpacity={0.02} /></linearGradient></defs><XAxis dataKey="stage" tick={{ fill: theme.text, fontSize: 11 }} axisLine={{ stroke: theme.grid }} tickLine={false} /><YAxis domain={[0, 100]} tick={{ fill: theme.text, fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip {...tooltipStyle(theme)} formatter={(value) => [`${value}%`, "Readiness"]} /><Area type="monotone" dataKey="readiness" stroke={theme.accent} strokeWidth={3} fill="url(#growthFill)" /><Line type="monotone" dataKey="readiness" stroke={theme.accent} dot={{ r: 4, fill: theme.accent, stroke: theme.tooltipBackground, strokeWidth: 2 }} /></AreaChart></ResponsiveContainer></div></CardContent></Card>;
}

export function SkillUtilizationRadial({ value }: { value: number }) {
  const theme = useChartTheme();
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="size-4 text-primary" />Skill utilization</CardTitle><p className="text-sm text-muted-foreground">Share of recorded skills at full demonstrated proficiency.</p></CardHeader><CardContent><div className="relative h-64"><ResponsiveContainer width="100%" height="100%"><RadialBarChart cx="50%" cy="50%" innerRadius="68%" outerRadius="92%" barSize={16} startAngle={90} endAngle={-270} data={[{ name: "utilized", value }]}><PolarAngleAxis type="number" domain={[0, 100]} tick={false} /><RadialBar dataKey="value" cornerRadius={10} background={{ fill: theme.secondary }} fill={theme.accent} /></RadialBarChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="font-heading text-4xl font-semibold">{value}%</span><span className="text-xs text-muted-foreground">fully utilized</span></div></div><div className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><TrendingUp className="size-3 text-primary" />Opportunity remains in underused capability</div></CardContent></Card>;
}

export function VisualAnalytics({ data }: { data: AnalyticsData }) {
  return <section className="grid gap-6"><MetricBadgesCard metrics={data.metrics} /><div className="grid gap-6 lg:grid-cols-2"><SkillDistributionChart data={data.skillDistribution} /><DepartmentReadinessChart data={data.departmentReadiness} /><GrowthTrendChart data={data.growthTrend} /><SkillUtilizationRadial value={data.skillUtilization} /></div></section>;
}
