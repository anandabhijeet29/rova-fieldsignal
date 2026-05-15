"use client";

/**
 * DashboardView — Manager dashboard with real-time updates (Step 7).
 *
 * Shows:
 *   - Per-visit: HCP name, status, extracted sentiment, top objections, follow-ups
 *   - Territory-level: trending objections, competitive mentions, prescription trends
 *   - Updates within ~5s of each debrief completing (Supabase real-time, D15)
 */

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { subscribeToVisitChanges } from "@/lib/db";
import type {
  Visit,
  HCP,
  Territory,
  ExtractedData,
  VisitStatus,
} from "@/lib/types";

interface VisitWithHcp extends Visit {
  hcp: HCP;
}

export default function DashboardView() {
  const [visits, setVisits] = useState<VisitWithHcp[]>([]);
  const [territory, setTerritory] = useState<Territory | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial data load
  useEffect(() => {
    async function load() {
      const [visitsRes, territoryRes] = await Promise.all([
        supabase
          .from("visits")
          .select("*, hcp:hcps(*)")
          .order("visit_date", { ascending: true })
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

      if (territoryRes.data) {
        setTerritory(territoryRes.data as Territory);
      }

      setLoading(false);
    }
    load();
  }, []);

  // Real-time subscription for visit changes
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const unsubscribe = subscribeToVisitChanges(today, (updated) => {
      const updatedVisit = updated as unknown as Visit;
      setVisits((prev) =>
        prev.map((v) =>
          v.id === updatedVisit.id ? { ...v, ...updatedVisit } : v
        )
      );
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  const debriefedVisits = visits.filter((v) => v.status === "debriefed");
  const totalVisits = visits.length;
  const avgSentiment = calculateSentimentScore(debriefedVisits);

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Visits Today" value={`${debriefedVisits.length}/${totalVisits}`} />
        <StatCard label="Avg Sentiment" value={avgSentiment} />
        <StatCard
          label="Follow-ups"
          value={String(
            debriefedVisits.reduce(
              (sum, v) => sum + (v.extracted_data?.follow_ups?.length ?? 0),
              0
            )
          )}
        />
        <StatCard
          label="Samples Dropped"
          value={String(
            debriefedVisits.reduce(
              (sum, v) => sum + (v.extracted_data?.samples_dropped?.length ?? 0),
              0
            )
          )}
        />
      </div>

      {/* Visit cards */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Visit Activity
        </h3>
        <div className="space-y-3">
          {visits.map((visit) => (
            <VisitCard key={visit.id} visit={visit} />
          ))}
        </div>
      </div>

      {/* Territory intelligence */}
      {territory && (
        <div className="grid grid-cols-3 gap-4">
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

          {/* Competitive mentions */}
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
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  );
}

function VisitCard({ visit }: { visit: VisitWithHcp }) {
  const data = visit.extracted_data;
  const statusColors: Record<VisitStatus, string> = {
    upcoming: "bg-zinc-100 text-zinc-600",
    briefed: "bg-blue-100 text-blue-700",
    extracting: "bg-amber-100 text-amber-700",
    debriefed: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {visit.hcp.name}
          </h4>
          <p className="text-xs text-zinc-500">{visit.hcp.specialty}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[visit.status]}`}>
          {visit.status}
        </span>
      </div>

      {data && (
        <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
          {/* Sentiment */}
          <div>
            <p className="font-medium text-zinc-500">Sentiment</p>
            <p
              className={`font-semibold ${
                data.sentiment === "positive"
                  ? "text-emerald-600"
                  : data.sentiment === "negative"
                  ? "text-red-600"
                  : "text-zinc-600"
              }`}
            >
              {data.sentiment}
            </p>
          </div>

          {/* Rx Intent */}
          <div>
            <p className="font-medium text-zinc-500">Rx Intent</p>
            <p
              className={`font-semibold ${
                data.prescription_intent === "likely"
                  ? "text-emerald-600"
                  : data.prescription_intent === "unlikely"
                  ? "text-red-600"
                  : "text-zinc-600"
              }`}
            >
              {data.prescription_intent}
            </p>
          </div>

          {/* Follow-ups count */}
          <div>
            <p className="font-medium text-zinc-500">Follow-ups</p>
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">
              {data.follow_ups.length}
            </p>
          </div>

          {/* Objections */}
          {data.objections.length > 0 && (
            <div className="col-span-3">
              <p className="font-medium text-zinc-500">Objections</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {data.objections.map((obj, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300"
                  >
                    {obj}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Competitive intel */}
          {data.competitive_intel.length > 0 && (
            <div className="col-span-3">
              <p className="font-medium text-zinc-500">Competitive Intel</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {data.competitive_intel.map((intel, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                  >
                    {intel}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

function calculateSentimentScore(visits: VisitWithHcp[]): string {
  if (visits.length === 0) return "—";

  const scores: number[] = visits
    .filter((v) => v.extracted_data)
    .map((v) => {
      switch (v.extracted_data!.sentiment) {
        case "positive": return 1;
        case "neutral": return 0;
        case "negative": return -1;
      }
    });

  if (scores.length === 0) return "—";

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg > 0.3) return "Positive";
  if (avg < -0.3) return "Negative";
  return "Neutral";
}
