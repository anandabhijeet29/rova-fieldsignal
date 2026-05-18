"use client";

/**
 * ThemeToggle — Dark/Light/System mode switcher (D8).
 *
 * Cycles through: system → light → dark → system.
 * Persists choice in localStorage. Defaults to system preference.
 */

import { useState, useEffect, useCallback } from "react";

type Theme = "system" | "light" | "dark";

const THEME_KEY = "rova-theme";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem(THEME_KEY) as Theme) ?? "system";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  } else {
    root.classList.toggle("dark", theme === "dark");
  }
}

const ICONS: Record<Theme, string> = {
  light: "☀️",
  dark: "🌙",
  system: "💻",
};

const LABELS: Record<Theme, string> = {
  light: "Light mode",
  dark: "Dark mode",
  system: "System theme",
};

const CYCLE: Theme[] = ["system", "light", "dark"];

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  // Initialize from localStorage on mount
  useEffect(() => {
    const stored = getStoredTheme();
    setTheme(stored);
    applyTheme(stored);
  }, []);

  // Listen for system preference changes when in "system" mode
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const cycle = useCallback(() => {
    const currentIndex = CYCLE.indexOf(theme);
    const next = CYCLE[(currentIndex + 1) % CYCLE.length];
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }, [theme]);

  return (
    <button
      onClick={cycle}
      aria-label={LABELS[theme]}
      title={LABELS[theme]}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:hover:bg-zinc-800"
    >
      <span aria-hidden="true">{ICONS[theme]}</span>
    </button>
  );
}
