"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Profile" },
  { href: "/roles", label: "Roles" },
  { href: "/what-if", label: "What-If" },
  { href: "/assistant", label: "Assistant" },
  { href: "/hr", label: "HR Dashboard" },
  { href: "/team", label: "Team Builder" },
] as const;

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
          <span className="font-heading text-lg font-semibold tracking-tight">
            TalentGraph
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {TABS.map((tab) => {
            const active =
              tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "text-primary-foreground bg-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
