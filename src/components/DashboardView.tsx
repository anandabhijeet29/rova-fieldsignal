"use client";

/**
 * DashboardView — Manager dashboard with real-time updates (Step 7).
 *
 * Layout:
 *   - Always-visible today's summary stat bar
 *   - Tab: "Today"   → today's visit cards + territory intel
 *   - Tab: "History" → most-recent prior visit per HCP
 *
 * Updates within ~5s of each debrief completing (Supabase real-time).
 */

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { subscribeToVisitChanges } from "@/lib/db";
import type { Visit, HCP, Territory, ExtractedData, VisitStatus } from "@/lib/types";

interface VisitWithHcp extends Visit {
  hcp: HCP;
}

// ── helpers ──────────────────────────────────────────────────────────

function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function sentimentColor(s: string | undefined) {
  if (s === "positive") return "text-emerald-600";
  if (s === "negative") return "text-red-600";
  return "text-zinc-500";
}

function rxColor(r: string | undefined) {
  if (r === "likely") return "text-emerald-600";
  if (r === "unlikely") return "text-red-600";
  return "text-zinc-500";
}

function calculateAvgSentiment(visits: VisitWithHcp[]): string {
  const scores: number[] = visits
    .filter((v) => v.extracted_data)
    .map((v) => {
      switch (v.extracted_data!.sentiment) {
        case "positive": return 1;
        case "negative": return -1;
        default: return 0;
      }
    });
  if (scores.length === 0) return "—";
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg > 0.3) return "Positive";
  if (avg < -0.3) return "Negative";
  return "Neutral";
}

// ── main component ───────────────────────────────────────────────────

type Tab = "today" | "history";

export default function DashboardView() {
  const [visits, setVisits] = useState<VisitWithHcp[]>([]);
  const [territory, setTerritory] = useState<Territory | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const today = localToday();

  // Initial load — all visits + territory
  useEffect(() => {
    async function load() {
      const [visitsRes, territoryRes] = await Promise.all([
        supabase
          .from("visits")
          .select("*, hcp:hcps(*)")
          .order("visit_date", { ascending: false })
          .order("visit_order", { ascending: true }),
        supabase.from("territory").select("*").limit(1).single(),
      ]);

      if (visitsRes.data) {
        setVisits(
          visitsRes.data.map((v: Record<string, unknown>) => ({
            ...v,
            hcp: v.hcp as HCP,
          })) as VisitWithHcp[]
        );
      }
      if (territoryRes.data) setTerritory(territoryRes.data as Territory);
      setLoading(false);
    }
    load();
  }, []);

  // Real-time — merge updated row back into state
  useEffect(() => {
    const unsubscribe = subscribeToVisitChanges(today, (updated) => {
      const u = updated as unknown as Visit;
      setVisits((prev) =>
        prev.map((v) => (v.id === u.id ? { ...v, ...u } : v))
      );
    });
    return unsubscribe;
  }, [today]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  const todayVisits = visits.filter((v) => v.visit_date === today);
  const historyVisits = visits.filter((v) => v.visit_date !== today);
  const todayDebriefed = todayVisits.filter((v) => v.status === "debriefed");

  // Most-recent prior visit per HCP (for history section)
  const latestPerHcp = Object.values(
    historyVisits.reduce<Record<string, VisitWithHcp>>((acc, v) => {
      if (!acc[v.hcp_id] || v.visit_date > acc[v.hcp_id].visit_date) {
        acc[v.hcp_id] = v;
      }
      return acc;
    }, {})
  );

  return (
    <div className="space-y-6 pb-20 md:pb-0">

      {/* ── Inline metrics strip — always visible ── */}
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3 border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <MetricStat
          value={`${todayDebriefed.length}/${todayVisits.length}`}
          label="debriefed"
        />
        <MetricStat
          value={calculateAvgSentiment(todayDebriefed)}
          label="sentiment"
        />
        <MetricStat
          value={String(
            todayDebriefed.reduce(
              (n, v) => n + (v.extracted_data?.follow_ups?.length ?? 0),
              0
            )
          )}
          label="follow-ups"
        />
        <MetricStat
          value={String(
            todayDebriefed.reduce(
              (n, v) => n + (v.extracted_data?.samples_dropped?.length ?? 0),
              0
            )
          )}
          label="samples"
        />
      </div>

      {/* ── Tab bar — fixed bottom on mobile, inline on desktop (D8) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white/95 px-4 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-sm md:static md:z-auto md:border-t-0 md:bg-transparent md:px-0 md:pb-0 md:pt-0 md:backdrop-blur-none dark:border-zinc-800 dark:bg-zinc-900/95 md:dark:bg-transparent">
        <div className="flex gap-1 md:rounded-xl md:border md:border-zinc-200 md:bg-zinc-50 md:p-1 md:dark:border-zinc-800 md:dark:bg-zinc-900">
          <TabButton
            label="Today"
            badge={todayVisits.length}
            active={activeTab === "today"}
            onClick={() => setActiveTab("today")}
          />
          <TabButton
            label="History"
            badge={latestPerHcp.length}
            active={activeTab === "history"}
            onClick={() => setActiveTab("history")}
          />
        </div>
      </div>

      {/* ── Tab: Today ── */}
      {activeTab === "today" && (
        <div className="space-y-8">
          <section>
            <SectionHeader title="Today's Visits" date={formatDate(today)} count={todayVisits.length} />
            {todayVisits.length === 0 ? (
              <EmptyState message="Waiting for today's first debrief — visits will appear here as the rep completes them." />
            ) : (
              <div className="space-y-3">
                {todayVisits.map((v) => (
                  <VisitCard key={v.id} visit={v} showDate={false} isToday />
                ))}
              </div>
            )}
          </section>

          {territory && <TerritoryPanel territory={territory} />}
        </div>
      )}

      {/* ── Tab: History ── */}
      {activeTab === "history" && (
        <section>
          <SectionHeader
            title="Prior Visit History"
            sub="Most recent completed visit per HCP"
            count={latestPerHcp.length}
          />
          {latestPerHcp.length === 0 ? (
            <EmptyState message="No visit history yet — data populates after your first completed debrief." />
          ) : (
            <div className="space-y-3">
              {latestPerHcp
                .sort((a, b) => b.visit_date.localeCompare(a.visit_date))
                .map((v) => (
                  <VisitCard key={v.id} visit={v} showDate isToday={false} />
                ))}
            </div>
          )}
        </section>
      )}

    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────

function SectionHeader({
  title,
  date,
  sub,
  count,
}: {
  title: string;
  date?: string;
  sub?: string;
  count?: number;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
        {date && (
          <span className="ml-2 text-xs font-normal text-zinc-500">{date}</span>
        )}
      </h3>
      <span className="text-xs text-zinc-400">
        {sub && `${sub} · `}{count !== undefined && `${count} records`}
      </span>
    </div>
  );
}

function MetricStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        {value}
      </span>
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-400 dark:border-zinc-700">
      {message}
    </p>
  );
}

const STATUS_LABEL: Record<VisitStatus, { text: string; color: string }> = {
  upcoming:   { text: "Upcoming",   color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  briefed:    { text: "Briefed",    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  extracting: { text: "Processing", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  debriefed:  { text: "Complete",   color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
};

function VisitCard({
  visit,
  showDate,
  isToday,
}: {
  visit: VisitWithHcp;
  showDate: boolean;
  isToday: boolean;
}) {
  const data: ExtractedData | null = visit.extracted_data ?? null;
  const st = STATUS_LABEL[visit.status];

  return (
    <div
      className={`rounded-xl p-4 ${
        isToday && data
          ? "border border-zinc-200 border-l-4 border-l-emerald-500 bg-white shadow-sm dark:border-zinc-700 dark:border-l-emerald-500 dark:bg-zinc-900"
          : isToday
          ? "border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
          : "border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60"
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {visit.hcp.name}
          </h4>
          <p className="text-xs text-zinc-500">
            {visit.hcp.specialty}
            {showDate && (
              <span className="ml-1.5 text-zinc-400">· {formatDate(visit.visit_date)}</span>
            )}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${st.color}`}>
          {st.text}
        </span>
      </div>

      {/* Extracted data grid */}
      {data ? (
        <div className="mt-3 space-y-2">
          {/* Metrics row */}
          <div className="flex gap-6 text-xs">
            <span>
              <span className="text-zinc-400">Sentiment </span>
              <span className={`font-semibold capitalize ${sentimentColor(data.sentiment)}`}>
                {data.sentiment}
              </span>
            </span>
            <span>
              <span className="text-zinc-400">Rx Intent </span>
              <span className={`font-semibold capitalize ${rxColor(data.prescription_intent)}`}>
                {data.prescription_intent}
              </span>
            </span>
            <span>
              <span className="text-zinc-400">Follow-ups </span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                {data.follow_ups.length}
              </span>
            </span>
            <span>
              <span className="text-zinc-400">Samples </span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                {data.samples_dropped.length}
              </span>
            </span>
          </div>

          {/* Objections */}
          {data.objections.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-xs text-zinc-400">Objections:</span>
              {data.objections.map((o, i) => (
                <span
                  key={i}
                  className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300"
                >
                  {o}
                </span>
              ))}
            </div>
          )}

          {/* Competitive intel */}
          {data.competitive_intel.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-xs text-zinc-400">Competitive:</span>
              {data.competitive_intel.map((c, i) => (
                <span
                  key={i}
                  className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          {/* Follow-up actions */}
          {data.follow_ups.length > 0 && (
            <div className="mt-1 space-y-0.5">
              <span className="text-xs text-zinc-400">Follow-up actions:</span>
              {data.follow_ups.map((f, i) => (
                <div key={i} className="flex items-start gap-1.5 text-xs">
                  <span className="mt-0.5 text-zinc-300">→</span>
                  <span className="text-zinc-600 dark:text-zinc-400">{f.action}</span>
                  {f.due_date && (
                    <span className="ml-auto shrink-0 text-zinc-400">{f.due_date}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        visit.status !== "upcoming" && (
          <p className="mt-2 text-xs text-zinc-400 italic">
            {visit.status === "extracting" ? "Processing debrief…" : "No extracted data available."}
          </p>
        )
      )}
    </div>
  );
}

function TabButton({
  label,
  badge,
  active,
  onClick,
}: {
  label: string;
  badge?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 md:py-2 ${
        active
          ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
          : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      }`}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-xs ${
            active
              ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
              : "bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function TerritoryPanel({ territory }: { territory: Territory }) {
  return (
    <section>
      <SectionHeader title="Territory Intelligence" sub="Northeast" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Trending objections */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Trending Objections
          </h4>
          <div className="space-y-2">
            {territory.trending_objections.map((obj, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-zinc-700 dark:text-zinc-300">{obj.objection}</span>
                <span
                  className={`text-xs font-medium ${
                    obj.trend === "rising"
                      ? "text-red-600"
                      : obj.trend === "declining"
                      ? "text-emerald-600"
                      : "text-zinc-500"
                  }`}
                >
                  {obj.trend === "rising" ? "↑" : obj.trend === "declining" ? "↓" : "→"}{" "}
                  {obj.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Competitive intel */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Competitive Intel
          </h4>
          <div className="space-y-2">
            {territory.competitive_mentions.map((comp, i) => (
              <div key={i} className="text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {comp.competitor}
                  </span>
                  <span className="text-xs text-zinc-500">{comp.mentions} mentions</span>
                </div>
                <p className="text-xs text-zinc-500">{comp.context}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Prescription trends */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Prescription Trends
          </h4>
          <div className="space-y-2">
            {territory.prescription_trends.map((trend, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-zinc-700 dark:text-zinc-300">{trend.drug_class}</span>
                <span
                  className={`text-xs font-medium ${
                    trend.trend === "up"
                      ? "text-emerald-600"
                      : trend.trend === "down"
                      ? "text-red-600"
                      : "text-zinc-500"
                  }`}
                >
                  {trend.trend === "up" ? "↑" : trend.trend === "down" ? "↓" : "→"}{" "}
                  {Math.round(trend.intent_rate * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
