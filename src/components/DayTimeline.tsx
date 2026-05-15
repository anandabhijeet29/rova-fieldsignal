"use client";

/**
 * DayTimeline — 4-visit day timeline for the demo harness (Step 5).
 *
 * Shows the rep's daily schedule with status indicators.
 * Mode switching based on visit status:
 *   upcoming  -> click Start -> briefing mode
 *   briefed   -> click Start -> debrief mode
 *   extracting -> show processing indicator
 *   debriefed  -> show completed checkmark
 */

import { useState, useEffect, useCallback } from "react";
import VoiceWidget from "./VoiceWidget";
import { getDaySchedule, getHcpBriefing, subscribeToScheduleChanges } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import type { ScheduledVisit, BriefingContext, VisitStatus } from "@/lib/types";

interface DayTimelineProps {
  visitDate: string;
}

const STATUS_CONFIG: Record<VisitStatus, { label: string; color: string; icon: string }> = {
  upcoming: { label: "Upcoming", color: "bg-zinc-100 text-zinc-600", icon: "○" },
  briefed: { label: "Briefed", color: "bg-blue-100 text-blue-700", icon: "◐" },
  extracting: { label: "Processing", color: "bg-amber-100 text-amber-700", icon: "⟳" },
  debriefed: { label: "Complete", color: "bg-emerald-100 text-emerald-700", icon: "●" },
};

export default function DayTimeline({ visitDate }: DayTimelineProps) {
  const [schedule, setSchedule] = useState<ScheduledVisit[]>([]);
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);
  const [briefingContext, setBriefingContext] = useState<BriefingContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load daily schedule
  useEffect(() => {
    async function loadSchedule() {
      try {
        const data = await getDaySchedule(visitDate);
        setSchedule(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load schedule");
      } finally {
        setLoading(false);
      }
    }
    loadSchedule();
  }, [visitDate]);

  // Subscribe to real-time status changes
  useEffect(() => {
    const unsubscribe = subscribeToScheduleChanges(visitDate, (updated) => {
      setSchedule((prev) =>
        prev.map((visit) =>
          visit.id === (updated as { id: string }).id
            ? { ...visit, status: (updated as { status: VisitStatus }).status }
            : visit
        )
      );
    });
    return unsubscribe;
  }, [visitDate]);

  // Handle starting a briefing
  const handleStartBriefing = useCallback(async (visit: ScheduledVisit) => {
    try {
      // Prefetch pattern: HCP data + signed URL in parallel (D9)
      const context = await getHcpBriefing(visit.hcp_id);
      setBriefingContext(context);
      setActiveVisitId(visit.id);
    } catch (err) {
      console.error("Failed to prepare briefing:", err);
      setError("Unable to load briefing data");
    }
  }, []);

  // Handle starting a debrief
  const handleStartDebrief = useCallback((visit: ScheduledVisit) => {
    setBriefingContext(null);
    setActiveVisitId(visit.id);
  }, []);

  // Handle briefing completion — update status to 'briefed'
  const handleBriefingComplete = useCallback(async () => {
    if (!activeVisitId) return;
    try {
      // Update via API to ensure both tables stay in sync
      await supabase
        .from("rep_schedule")
        .update({ status: "briefed" })
        .eq("id", activeVisitId);
      await supabase
        .from("visits")
        .update({ status: "briefed" })
        .eq("id", activeVisitId);

      setSchedule((prev) =>
        prev.map((v) =>
          v.id === activeVisitId ? { ...v, status: "briefed" as VisitStatus } : v
        )
      );
    } catch (err) {
      console.error("Failed to update briefing status:", err);
    }
    setActiveVisitId(null);
    setBriefingContext(null);
  }, [activeVisitId]);

  // Handle debrief completion — POST to /api/debrief
  const handleDebriefComplete = useCallback(
    async (transcript: string) => {
      if (!activeVisitId) return;
      const visit = schedule.find((v) => v.id === activeVisitId);
      if (!visit) return;

      try {
        const res = await fetch("/api/debrief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visit_id: activeVisitId,
            hcp_id: visit.hcp_id,
            transcript,
          }),
        });

        if (!res.ok) throw new Error("Debrief API failed");

        // Status will update via real-time subscription, but also update locally
        setSchedule((prev) =>
          prev.map((v) =>
            v.id === activeVisitId
              ? { ...v, status: "debriefed" as VisitStatus }
              : v
          )
        );
      } catch (err) {
        console.error("Debrief submission failed:", err);
        setError("Failed to save debrief. Your recording is safe — try again.");
      }
      setActiveVisitId(null);
    },
    [activeVisitId, schedule]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Today&apos;s Visits
        </h2>
        <span className="text-sm text-zinc-500">
          {schedule.filter((v) => v.status === "debriefed").length}/{schedule.length} complete
        </span>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {schedule.map((visit, index) => {
          const statusConfig = STATUS_CONFIG[visit.status];
          const isActive = activeVisitId === visit.id;
          const agentMode = visit.status === "upcoming" ? "briefing" : "debrief";

          return (
            <div key={visit.id} className="relative">
              {/* Timeline connector */}
              {index < schedule.length - 1 && (
                <div className="absolute left-5 top-12 h-6 w-px bg-zinc-200 dark:bg-zinc-700" />
              )}

              <div
                className={`rounded-xl border p-4 transition-all ${
                  isActive
                    ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10"
                    : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Visit number */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {visit.visit_order}
                  </div>

                  {/* Visit info */}
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {visit.hcp.name}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {visit.hcp.specialty} · {visit.hcp.prescribing_tier} prescriber
                    </p>
                  </div>

                  {/* Status badge */}
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig.color}`}
                  >
                    {statusConfig.icon} {statusConfig.label}
                  </span>

                  {/* Action button */}
                  {(visit.status === "upcoming" || visit.status === "briefed") &&
                    !isActive && (
                      <button
                        onClick={() =>
                          visit.status === "upcoming"
                            ? handleStartBriefing(visit)
                            : handleStartDebrief(visit)
                        }
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
                      >
                        {visit.status === "upcoming" ? "Brief" : "Debrief"}
                      </button>
                    )}

                  {visit.status === "extracting" && (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                  )}
                </div>

                {/* Active voice widget */}
                {isActive && (
                  <div className="mt-4">
                    <VoiceWidget
                      visitId={visit.id}
                      hcp={visit.hcp}
                      mode={agentMode}
                      briefingContext={briefingContext ?? undefined}
                      onDebriefComplete={handleDebriefComplete}
                      onBriefingComplete={handleBriefingComplete}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
