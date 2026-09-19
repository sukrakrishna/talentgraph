"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

export interface GraphSkill {
  skill_id: string;
  name: string;
  category: string;
  source: "explicit" | "inferred";
  evidence: string;
  proficiency: number;
  linked_to: string[];
}

interface SkillGraphProps {
  employeeName: string;
  skills: GraphSkill[];
  /** Skill ids to omit from the rendered graph without affecting reveal timing/order. */
  hiddenSkillIds?: Set<string>;
  onSelectSkill?: (skill: GraphSkill | null) => void;
}

const COLOR_EMPLOYEE = "#fbbf24"; // --chart-5
const COLOR_INFERRED = "#c6f432"; // --chart-1 / --primary — the "AI-inferred" lime
const COLOR_INFERRED_LINK = "rgba(198, 244, 50, 0.4)";
const COLOR_DERIVED_LINK = "rgba(198, 244, 50, 0.4)";

const EMPLOYEE_NODE_ID = "__employee__";
const REVEAL_STEP_MS = 120;
const EMPTY_HIDDEN_IDS: Set<string> = new Set();

interface GraphNode {
  id: string;
  label: string;
  kind: "employee" | "skill";
  source?: "explicit" | "inferred";
  proficiency?: number;
  skill?: GraphSkill;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
  kind: "owns" | "derived";
  dashed: boolean;
}

function nodeRadius(node: GraphNode): number {
  if (node.kind === "employee") return 9;
  return 4 + (node.proficiency ?? 1) * 2;
}

export function SkillGraph({
  employeeName,
  skills,
  hiddenSkillIds = EMPTY_HIDDEN_IDS,
  onSelectSkill,
}: SkillGraphProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const colorExplicit = isDark ? "#94a3b8" : "#64748b";
  const colorLink = isDark ? "rgba(232, 236, 241, 0.22)" : "rgba(9, 9, 11, 0.22)";
  const colorNodeRing = isDark ? "rgba(13, 16, 20, 0.65)" : "rgba(255, 255, 255, 0.9)";
  const colorLabel = isDark ? "#e8ecf1" : "#09090b";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 480 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Nodes reveal one at a time (rather than all at once) whenever the skill set
  // changes — e.g. right after an extraction — for a "building the graph" feel.
  const skillKey = useMemo(() => skills.map((s) => s.skill_id).join("|"), [skills]);
  const skillCount = skills.length;
  const [revealCount, setRevealCount] = useState(0);

  // Reset the reveal progress during render when the skill set changes, rather
  // than in an effect — see https://react.dev/learn/you-might-not-need-an-effect
  const [seenSkillKey, setSeenSkillKey] = useState(skillKey);
  if (seenSkillKey !== skillKey) {
    setSeenSkillKey(skillKey);
    setRevealCount(0);
  }

  useEffect(() => {
    if (revealCount >= skillCount) return;
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (!cancelled) setRevealCount((c) => c + 1);
    }, REVEAL_STEP_MS);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [skillCount, revealCount]);

  const revealedSkills = useMemo(() => skills.slice(0, revealCount), [skills, revealCount]);

  const { nodes, links } = useMemo(() => {
    const visibleSkills = revealedSkills.filter((s) => !hiddenSkillIds.has(s.skill_id));
    const skillIds = new Set(visibleSkills.map((s) => s.skill_id));
    const nodes: GraphNode[] = [
      { id: EMPLOYEE_NODE_ID, label: employeeName, kind: "employee" },
      ...visibleSkills.map((s) => ({
        id: s.skill_id,
        label: s.name,
        kind: "skill" as const,
        source: s.source,
        proficiency: s.proficiency,
        skill: s,
      })),
    ];

    const links: GraphLink[] = [];
    for (const s of visibleSkills) {
      links.push({
        source: EMPLOYEE_NODE_ID,
        target: s.skill_id,
        kind: "owns",
        dashed: s.source === "inferred",
      });
      for (const linkedId of s.linked_to) {
        if (skillIds.has(linkedId)) {
          links.push({ source: linkedId, target: s.skill_id, kind: "derived", dashed: true });
        }
      }
    }

    return { nodes, links };
  }, [employeeName, revealedSkills, hiddenSkillIds]);

  const handleNodeClick = useCallback(
    (node: GraphNode) => onSelectSkill?.(node.skill ?? null),
    [onSelectSkill]
  );

  return (
    <div
      ref={containerRef}
      className="relative h-[480px] w-full overflow-hidden rounded-xl border border-border bg-background"
    >
      {size.width > 0 && (
        <ForceGraph2D
          width={size.width}
          height={size.height}
          graphData={{ nodes, links }}
          nodeId="id"
          nodeRelSize={1}
          backgroundColor={isDark ? "#0d1014" : "#fafafa"}
          cooldownTicks={100}
          linkColor={(link) => {
            const l = link as unknown as GraphLink;
            if (l.kind === "derived") return COLOR_DERIVED_LINK;
            return l.dashed ? COLOR_INFERRED_LINK : colorLink;
          }}
          linkWidth={(link) => ((link as unknown as GraphLink).kind === "derived" ? 1 : 1.4)}
          linkLineDash={(link) => ((link as unknown as GraphLink).dashed ? [2, 2] : null)}
          onNodeClick={(node) => handleNodeClick(node as GraphNode)}
          onBackgroundClick={() => onSelectSkill?.(null)}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const n = node as GraphNode;
            const r = nodeRadius(n);
            const x = n.x ?? 0;
            const y = n.y ?? 0;
            const isInferred = n.kind === "skill" && n.source === "inferred";
            const color =
              n.kind === "employee" ? COLOR_EMPLOYEE : n.source === "explicit" ? colorExplicit : COLOR_INFERRED;

            ctx.save();
            if (isInferred) {
              // The "glow" for AI-inferred nodes.
              ctx.shadowColor = COLOR_INFERRED;
              ctx.shadowBlur = 10;
            }
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2 * Math.PI, false);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.restore();

            ctx.setLineDash(isInferred ? [1.5, 1.5] : []);
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = colorNodeRing;
            ctx.stroke();
            ctx.setLineDash([]);

            const fontSize = Math.max(10, 12 / globalScale);
            ctx.font = `${n.kind === "employee" ? "700 " : "500 "}${fontSize}px system-ui, sans-serif`;
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillStyle = colorLabel;
            ctx.fillText(n.label, x + r + 3, y);
          }}
          nodePointerAreaPaint={(node, color, ctx) => {
            const n = node as GraphNode;
            const r = nodeRadius(n);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(n.x ?? 0, n.y ?? 0, r + 6, 0, 2 * Math.PI, false);
            ctx.fill();
          }}
        />
      )}
      {skills.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-muted-foreground">
          No skills yet — write a bio and click &ldquo;Build skill graph&rdquo; to get started.
        </div>
      )}
    </div>
  );
}
