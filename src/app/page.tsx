/**
 * Demo harness: day timeline + voice widgets (Step 5).
 *
 * Single-page rep interface showing the 4-visit daily schedule.
 * Each visit card opens a VoiceWidget for briefing or debrief.
 */

import DayTimeline from "@/components/DayTimeline";

export default function Home() {
  // Use today's date for the demo
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Rova
            </h1>
            <p className="text-xs text-zinc-500">Field Signal Intelligence</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500">{today}</span>
            <a
              href="/dashboard"
              className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Manager View
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-2xl px-6 py-6">
        <DayTimeline visitDate={today} />
      </main>
    </div>
  );
}
