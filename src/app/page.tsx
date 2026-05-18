/**
 * Demo harness: day timeline + voice widgets (Step 5).
 *
 * Single-page rep interface showing the 4-visit daily schedule.
 * Each visit card opens a VoiceWidget for briefing or debrief.
 */

import DayTimeline from "@/components/DayTimeline";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  // Use local date (not UTC) to match Supabase CURRENT_DATE
  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todayDisplay = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Rova
            </h1>
            <p className="text-xs text-zinc-500">Field Signal Intelligence</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">{todayDisplay}</span>
            <a
              href="/dashboard"
              className="rounded-lg bg-zinc-100 px-3 py-2.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Manager View
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="mx-auto max-w-2xl px-6 py-6">
        <DayTimeline visitDate={todayISO} />
      </main>
    </div>
  );
}
