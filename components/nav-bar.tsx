"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { JudgeSandbox } from "@/components/judge-sandbox";

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
    <header className="sticky top-3 z-50 mx-3 rounded-2xl border border-border/70 bg-background/75 shadow-[0_12px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 sm:mx-6">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:gap-6 sm:px-6 sm:py-0">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
          <span className="font-heading text-lg font-semibold tracking-tight">
            TalentGraph
          </span>
        </Link>
        <nav className="order-3 flex w-full min-w-0 items-center gap-1 overflow-x-auto sm:order-none sm:w-auto sm:flex-1">
          {TABS.map((tab) => {
            const active =
              tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
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
        <JudgeSandbox />
        <ThemeToggle className="ml-auto sm:ml-0" />
      </div>
    </header>
  );
}
