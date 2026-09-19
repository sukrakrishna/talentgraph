"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const isDark = resolvedTheme === "dark";

  function cycleTheme() {
    setTheme(theme === "dark" ? "light" : theme === "light" ? "system" : "dark");
  }

  if (!mounted) {
    return (
      <Button type="button" variant="ghost" size="icon" className={cn(className)} aria-label="Toggle theme" title="Toggle theme">
        <Moon />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(className)}
      onClick={cycleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "system" ? "System theme" : isDark ? "Light theme" : "System theme"}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
