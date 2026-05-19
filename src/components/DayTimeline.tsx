"use client";

/**
 * DayTimeline — rep's daily visit schedule with date navigation.
 *
 * Date navigation: ‹ prev day / next day › arrows + "Today" shortcut.
 * Future dates: Brief/Debrief CTAs replaced with "Scheduled" chip.
 * Past unactioned visits: "Missed" chip.
 * Real-time subscription only active for today.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import VoiceWidget from "./VoiceWidget";
import CrossVisitCard from "./CrossVisitCard";
import { getDaySchedule, getHcpBriefing, subscribeToScheduleChanges } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import type { ScheduledVisit, BriefingContext, VisitStatus } from "@/lib/types";

interface DayTimelineProps {
  visitDate: string; // initial date passed from page (today's ISO string)
}

const STATUS_CONFIG: Record<VisitStatus, { label: string; color: string; icon: string }> = {
  upcoming:   { label: "Upcoming",   color: "bg-zinc-100 text-zinc-600",            icon: "○" },
  briefed:    { label: "Briefed",    color: "bg-blue-100 text-blue-700",            icon: "◐" },
  extracting: { label: "Processing", color: "bg-amber-100 text-amber-700",          icon: "⟳" },
  debriefed:  { label: "Complete",   color: "bg-emerald-100 text-emerald-700",      icon: "●" },
};

function dateToISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DayTimeline({ visitDate }: DayTimelineProps) {
  const todayISO = useMemo(() => dateToISO(new Date()), []);

  const [currentDate, setCurrentDate] = useState(visitDate);
  const [schedule, setSchedule] = useState<ScheduledVisit[]>([]);
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);
  const [briefingContext, setBriefingContext] = useState<BriefingContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentlyCompletedId, setRecentlyCompletedId] = useState<string | null>(null);

  const isToday = currentDate === todayISO;
  const isFuture = currentDate > todayISO;
  const isPast = currentDate < todayISO;

  // ── Date navigation ──────────────────────────────────────────────────

  const goToDate = useCallback((iso: string) => {
    setCurrentDate(iso);
    setActiveVisitId(null);
    setBriefingContext(null);
    setRecentlyCompletedId(null);
  }, []);

  function navigate(direction: -1 | 1) {
    const d = new Date(currentDate + "T00:00:00");
    d.setDate(d.getDate() + direction);
    goToDate(dateToISO(d));
  }

  function formatCurrentDate(): string {
    if (isToday) return "Today";
    const d = new Date(currentDate + "T00:00:00");
    const tomorrow = new Date(todayISO + "T00:00:00");
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (currentDate === dateToISO(tomorrow)) return "Tomorrow";
    const yesterday = new Date(todayISO + "T00:00:00");
    yesterday.setDate(yesterday.getDate() - 1);
    if (currentDate === dateToISO(yesterday)) return "Yesterday";
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  // ── Load schedule on date change ─────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSchedule([]);
    async function loadSchedule() {
      try {
        const data = await getDaySchedule(currentDate);
        setSchedule(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load schedule");
      } finally {
        setLoading(false);
      }
    }
    loadSchedule();
  }, [currentDate]);

  // ── Real-time updates — only for today ───────────────────────────────

  useEffect(() => {
    if (!isToday) return;
    const unsubscribe = subscribeToScheduleChanges(currentDate, (updated) => {
      const uid = (updated as { id: string }).id;
      const newStatus = (updated as { status: VisitStatus }).status;
      setSchedule((prev) =>
        prev.map((visit) =>
          visit.id === uid ? { ...visit, status: newStatus } : visit
        )
      );
      if (newStatus === "debriefed") {
        setRecentlyCompletedId((prev) => (prev === uid ? null : prev));
      }
    });
    return unsubscribe;
  }, [currentDate, isToday]);

  // ── Visit action handlers ────────────────────────────────────────────

  const handleStartBriefing = useCallback(async (visit: ScheduledVisit) => {
    try {
      const context = await getHcpBriefing(visit.hcp_id);
      setBriefingContext(context);
      setActiveVisitId(visit.id);
    } catch (err) {
      console.error("Failed to prepare briefing:", err);
      setError("Unable to load briefing data");
    }
  }, []);

  const handleStartDebrief = useCallback((visit: ScheduledVisit) => {
    setBriefingContext(null);
    setActiveVisitId(visit.id);
  }, []);

  const handleBriefingComplete = useCallback(async () => {
    if (!activeVisitId) return;
    try {
      await supabase.from("rep_schedule").update({ status: "briefed" }).eq("id", activeVisitId);
      await supabase.from("visits").update({ status: "briefed" }).eq("id", activeVisitId);
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

  const handleDebriefComplete = useCallback(
    async (transcript: string) => {
      if (!activeVisitId) return;
      const visit = schedule.find((v) => v.id === activeVisitId);
      if (!visit) return;

      setRecentlyCompletedId(activeVisitId);
      setSchedule((prev) =>
        prev.map((v) =>
          v.id === activeVisitId ? { ...v, status: "extracting" as VisitStatus } : v
        )
      );
      setActiveVisitId(null);

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
      } catch (err) {
        console.error("Debrief submission failed:", err);
        setError("Failed to save debrief. Your recording is safe — try again.");
      }
    },
    [activeVisitId, schedule]
  );

  // ── Render ───────────────────────────────────────────────────────────

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

  const nextVisitId = schedule.find(
    (v) => v.status === "upcoming" || v.status === "briefed"
  )?.id;

  return (
    <div className="space-y-4">

      {/* ── Header: date navigation ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Previous day"
          >
            ‹
          </button>
          <h2 className="px-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {formatCurrentDate()}
          </h2>
          <button
            onClick={() => navigate(1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Next day"
          >
            ›
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!isToday && (
            <button
              onClick={() => goToDate(todayISO)}
              className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100 focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
            >
              Today
            </button>
          )}
          <span className="text-sm text-zinc-500">
            {schedule.filter((v) => v.status === "debriefed").length}/{schedule.length} complete
          </span>
        </div>
      </div>

      {/* ── Future-date info banner ── */}
      {isFuture && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-400">
          Viewing upcoming schedule — visit actions unlock on the day.
        </div>
      )}

      {/* ── Empty state ── */}
      {schedule.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            No visits scheduled {isToday ? "for today" : `for ${formatCurrentDate().toLowerCase()}`}
          </p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Import your schedule or check back when visits are assigned.
          </p>
        </div>
      )}

      {/* ── Timeline ── */}
      <div className="space-y-2">
        {schedule.map((visit, index) => {
          const statusConfig = STATUS_CONFIG[visit.status];
          const isActive = activeVisitId === visit.id;
          const isNext = !isActive && visit.id === nextVisitId;
          const isCompleted = visit.status === "debriefed";
          const agentMode = visit.status === "upcoming" ? "briefing" : "debrief";

          {/* ── Completed visits: slim summary row ── */}
          if (isCompleted && !isActive) {
            return (
              <div key={visit.id} className="relative">
                {index < schedule.length - 1 && (
                  <div className="absolute left-4 top-9 h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
                )}
                <div className="flex items-center gap-3 rounded-lg px-3 py-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    ✓
                  </div>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">{visit.hcp.name}</span>
                  <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-400">Complete</span>
                </div>
              </div>
            );
          }

          {/* ── "Got it" confirmation after debrief ── */}
          if (visit.id === recentlyCompletedId && visit.status === "extracting") {
            return (
              <div key={visit.id} className="relative">
                {index < schedule.length - 1 && (
                  <div className="absolute left-5 top-14 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
                )}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                      ✓
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                        Got it — processing your notes
                      </h3>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">
                        {visit.hcp.name} debrief saved. Move on to your next visit.
                      </p>
                    </div>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                  </div>
                </div>
              </div>
            );
          }

          {/* ── Main visit card ── */}
          return (
            <div key={visit.id} className="relative">
              {index < schedule.length - 1 && (
                <div
                  className={`absolute left-5 w-px bg-zinc-200 dark:bg-zinc-700 ${
                    isNext ? "top-[4.5rem] h-4" : "top-14 h-4"
                  }`}
                />
              )}

              <div
                className={`rounded-xl transition-all ${
                  isActive
                    ? "border border-emerald-300 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-800 dark:bg-emerald-900/10"
                    : isNext
                    ? "border border-zinc-200 border-l-4 border-l-blue-500 bg-white p-5 shadow-sm dark:border-zinc-700 dark:border-l-blue-500 dark:bg-zinc-900"
                    : "border border-zinc-200 bg-white p-4 hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Visit number */}
                  <div
                    className={`flex shrink-0 items-center justify-center rounded-full font-bold ${
                      isNext
                        ? "h-12 w-12 bg-blue-100 text-base text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        : "h-10 w-10 bg-zinc-100 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {visit.visit_order}
                  </div>

                  {/* Visit info */}
                  <div className="min-w-0 flex-1">
                    <h3
                      className={`font-semibold text-zinc-900 dark:text-zinc-100 ${
                        isNext ? "text-base" : "text-sm"
                      }`}
                    >
                      {visit.hcp.name}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {visit.hcp.specialty} · {visit.hcp.prescribing_tier} prescriber
                    </p>
                  </div>

                  {/* Right side: context-aware action / badge */}
                  {!isActive && (() => {
                    // Processing spinner
                    if (visit.status === "extracting") {
                      return (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                      );
                    }
                    // Future date: scheduled chip (no CTA)
                    if (isFuture && (visit.status === "upcoming" || visit.status === "briefed")) {
                      return (
                        <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          Scheduled
                        </span>
                      );
                    }
                    // Past + still upcoming: missed
                    if (isPast && visit.status === "upcoming") {
                      return (
                        <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-500 dark:bg-red-900/20 dark:text-red-400">
                          Missed
                        </span>
                      );
                    }
                    // Past + briefed or any non-today non-actionable: status badge
                    if (!isToday) {
                      return (
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig.color}`}>
                          {statusConfig.icon} {statusConfig.label}
                        </span>
                      );
                    }
                    // Today + upcoming or briefed: action button
                    if (visit.status === "upcoming" || visit.status === "briefed") {
                      return (
                        <button
                          onClick={() =>
                            visit.status === "upcoming"
                              ? handleStartBriefing(visit)
                              : handleStartDebrief(visit)
                          }
                          className={`shrink-0 rounded-lg bg-blue-600 font-medium text-white transition-colors hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                            isNext ? "px-5 py-3 text-sm" : "px-4 py-2.5 text-sm"
                          }`}
                        >
                          {visit.status === "upcoming" ? "Brief" : "Debrief"}
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Cross-visit intelligence before briefing */}
                {isActive && agentMode === "briefing" && briefingContext?.crossVisitContext && (
                  <div className="mt-3">
                    <CrossVisitCard
                      context={briefingContext.crossVisitContext}
                      variant="pre-briefing"
                    />
                  </div>
                )}

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
