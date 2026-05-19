/**
 * Centralized Supabase service module (D6).
 * All database queries go through here — single source of truth.
 */

import { supabase, createServerClient } from "./supabase";
import type {
  HCP,
  Visit,
  Territory,
  ScheduledVisit,
  ExtractedData,
  BriefingContext,
  VisitStatus,
} from "./types";

// ── Read operations (client-side safe) ──────────────────────────────

/**
 * Fetch full HCP profile + prior visit history for briefing.
 */
export async function getHcpBriefing(hcpId: string): Promise<BriefingContext> {
  const [hcpResult, visitsResult, territoryResult] = await Promise.all([
    supabase.from("hcps").select("*").eq("id", hcpId).single(),
    supabase
      .from("visits")
      .select("*")
      .eq("hcp_id", hcpId)
      .eq("status", "debriefed")
      .order("visit_date", { ascending: false })
      .limit(5),
    supabase.from("territory").select("*").limit(1).single(),
  ]);

  if (hcpResult.error) throw new Error(`HCP not found: ${hcpResult.error.message}`);

  const hcp = hcpResult.data as HCP;
  const priorVisits = (visitsResult.data ?? []) as Visit[];
  const territory = (territoryResult.data as Territory) ?? null;

  // Fetch cross-visit context from other reps' debriefs
  const crossVisitContext = await getCrossVisitContext(hcp, priorVisits);

  return { hcp, priorVisits, crossVisitContext, territory };
}

/**
 * Get the day's visit schedule with HCP details.
 */
export async function getDaySchedule(
  visitDate: string,
  repId: string = "demo-rep"
): Promise<ScheduledVisit[]> {
  const { data, error } = await supabase
    .from("rep_schedule")
    .select("*, hcp:hcps(*)")
    .eq("visit_date", visitDate)
    .eq("rep_id", repId)
    .order("visit_order", { ascending: true });

  if (error) throw new Error(`Schedule fetch failed: ${error.message}`);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    hcp: row.hcp as HCP,
  })) as ScheduledVisit[];
}

/**
 * Get the next visit in the schedule that hasn't been briefed yet.
 */
export async function getNextVisit(
  visitDate: string,
  repId: string = "demo-rep"
): Promise<ScheduledVisit | null> {
  const { data, error } = await supabase
    .from("rep_schedule")
    .select("*, hcp:hcps(*)")
    .eq("visit_date", visitDate)
    .eq("rep_id", repId)
    .eq("status", "upcoming")
    .order("visit_order", { ascending: true })
    .limit(1)
    .single();

  if (error) return null;
  return { ...data, hcp: data.hcp as HCP } as ScheduledVisit;
}

/**
 * Get territory-level intelligence.
 */
export async function getTerritoryInsights(
  region: string
): Promise<Territory | null> {
  const { data, error } = await supabase
    .from("territory")
    .select("*")
    .eq("region", region)
    .single();

  if (error) return null;
  return data as Territory;
}

// ── Write operations (server-side) ──────────────────────────────────

/**
 * Update visit status in both visits and rep_schedule tables.
 */
export async function updateVisitStatus(
  visitId: string,
  status: string
): Promise<void> {
  const db = createServerClient();

  const { error } = await db
    .from("visits")
    .update({ status })
    .eq("id", visitId);

  if (error) throw new Error(`Status update failed: ${error.message}`);

  // Also update rep_schedule for dashboard tracking
  await db.from("rep_schedule").update({ status }).eq("id", visitId);
}

/**
 * Save debrief results: transcript, extracted data, and cross-visit summary.
 */
export async function logDebrief(
  visitId: string,
  transcript: string,
  extractedData: ExtractedData | null,
  crossVisitSummary: string | null
): Promise<void> {
  const db = createServerClient();

  const { error } = await db
    .from("visits")
    .update({
      raw_transcript: transcript,
      extracted_data: extractedData,
      cross_visit_summary: crossVisitSummary,
      status: "debriefed",
    })
    .eq("id", visitId);

  if (error) throw new Error(`Debrief save failed: ${error.message}`);

  // Sync status to rep_schedule
  await db
    .from("rep_schedule")
    .update({ status: "debriefed" })
    .eq("id", visitId);
}

/**
 * Mark visit as extracting (intermediate state for dashboard).
 */
export async function markExtracting(visitId: string): Promise<void> {
  await updateVisitStatus(visitId, "extracting");
}

// ── Cross-visit intelligence (D3: substring matching with curated data) ─

/**
 * Find relevant prior debriefs from other HCPs for cross-visit intelligence.
 *
 * v1 relevance filter:
 *   - Same practice_group as the target HCP, OR
 *   - competitive_intel from a prior visit substring-matches the target HCP's preferred_topics
 *
 * Returns up to 500 tokens of cross-visit context.
 */
async function getCrossVisitContext(
  targetHcp: HCP,
  _excludeVisits: Visit[]
): Promise<string | null> {
  // Get all debriefed visits from other HCPs
  const { data: allDebriefedVisits } = await supabase
    .from("visits")
    .select("*, hcp:hcps(*)")
    .eq("status", "debriefed")
    .neq("hcp_id", targetHcp.id)
    .order("visit_date", { ascending: false });

  if (!allDebriefedVisits || allDebriefedVisits.length === 0) return null;

  const relevantSummaries: string[] = [];
  const TOKEN_BUDGET = 500;
  let currentTokens = 0;

  for (const visit of allDebriefedVisits) {
    const visitHcp = visit.hcp as HCP;
    const extracted = visit.extracted_data as ExtractedData | null;

    if (!extracted || !visit.cross_visit_summary) continue;

    // Check relevance: practice group match OR topic-intel substring match
    const practiceGroupMatch =
      targetHcp.practice_group &&
      visitHcp.practice_group === targetHcp.practice_group;

    const topicMatch =
      targetHcp.preferred_topics?.some((topic: string) =>
        extracted.competitive_intel?.some((intel: string) =>
          intel.toLowerCase().includes(topic.toLowerCase())
        )
      ) ?? false;

    if (practiceGroupMatch || topicMatch) {
      const summary = `From ${visitHcp.name} (${visitHcp.specialty}): ${visit.cross_visit_summary}`;
      const summaryTokens = Math.ceil(summary.length / 4); // rough token estimate

      if (currentTokens + summaryTokens > TOKEN_BUDGET) break;

      relevantSummaries.push(summary);
      currentTokens += summaryTokens;
    }
  }

  return relevantSummaries.length > 0 ? relevantSummaries.join("\n\n") : null;
}

// ── Schedule management (client-side, read-only) ───────────────────

/**
 * Get all HCPs for the add-visit dropdown.
 */
export async function getHcpList(): Promise<HCP[]> {
  const { data, error } = await supabase
    .from("hcps")
    .select("*")
    .order("name");

  if (error) throw new Error(`HCP list fetch failed: ${error.message}`);
  return (data ?? []) as HCP[];
}

// ── Real-time subscriptions ─────────────────────────────────────────

/**
 * Subscribe to visit status changes for the dashboard.
 * Returns an unsubscribe function.
 */
export function subscribeToVisitChanges(
  visitDate: string,
  callback: (payload: Record<string, unknown>) => void
): () => void {
  const channel = supabase
    .channel("visit-changes")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "visits",
      },
      (payload) => callback(payload.new as Record<string, unknown>)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to schedule status changes for the day timeline.
 */
export function subscribeToScheduleChanges(
  visitDate: string,
  callback: (payload: Record<string, unknown>) => void
): () => void {
  const channel = supabase
    .channel("schedule-changes")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "rep_schedule",
      },
      (payload) => callback(payload.new as Record<string, unknown>)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
