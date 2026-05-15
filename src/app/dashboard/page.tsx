/**
 * Manager dashboard with real-time updates (Step 7).
 *
 * Shows territory intelligence + per-visit summaries.
 * Updates within ~5 seconds of each debrief completing.
 */

import DashboardView from "@/components/DashboardView";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Rova
            </h1>
            <p className="text-xs text-zinc-500">Territory Intelligence Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-emerald-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Live
            </span>
            <a
              href="/"
              className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Rep View
            </a>
          </div>
        </div>
      </header>

      {/* Dashboard content */}
      <main className="mx-auto max-w-5xl px-6 py-6">
        <DashboardView />
      </main>
    </div>
  );
}
