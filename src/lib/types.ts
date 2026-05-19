// Shared TypeScript types for Rova HCP Voice Agent

// ── Database row types ──────────────────────────────────────────────

export interface HCP {
  id: string;
  name: string;
  specialty: string;
  practice_group: string | null;
  prescribing_tier: "high" | "medium" | "low";
  preferred_topics: string[];
  notes: string | null;
  last_visit_date: string | null;
  region: string;
}

export interface Visit {
  id: string;
  hcp_id: string;
  visit_date: string;
  visit_order: number;
  raw_transcript: string | null;
  extracted_data: ExtractedData | null;
  cross_visit_summary: string | null;
  status: VisitStatus;
  created_at: string;
}

export interface Territory {
  id: string;
  region: string;
  trending_objections: TrendingObjection[];
  competitive_mentions: CompetitiveMention[];
  prescription_trends: PrescriptionTrend[];
}

export interface RepSchedule {
  id: string;
  rep_id: string;
  visit_date: string;
  visit_order: number;
  hcp_id: string;
  status: VisitStatus;
  region: string;
}

// ── Extracted data shape ────────────────────────────────────────────

export interface ExtractedData {
  sentiment: "positive" | "neutral" | "negative";
  objections: string[];
  samples_dropped: string[];
  follow_ups: FollowUp[];
  competitive_intel: string[];
  key_quotes: string[];
  prescription_intent: "likely" | "unlikely" | "unclear";
}

export interface FollowUp {
  action: string;
  due_date: string;
}

// ── Territory sub-types ─────────────────────────────────────────────

export interface TrendingObjection {
  objection: string;
  count: number;
  trend: "rising" | "stable" | "declining";
}

export interface CompetitiveMention {
  competitor: string;
  mentions: number;
  context: string;
}

export interface PrescriptionTrend {
  drug_class: string;
  intent_rate: number;
  trend: "up" | "flat" | "down";
}

// ── Status types ────────────────────────────────────────────────────

export type VisitStatus = "upcoming" | "briefed" | "extracting" | "debriefed" | "skipped" | "rescheduled";

// ── Voice agent types ───────────────────────────────────────────────

export type AgentMode = "briefing" | "debrief";

export interface BriefingContext {
  hcp: HCP;
  priorVisits: Visit[];
  crossVisitContext: string | null;
  territory: Territory | null;
}

export interface ScheduledVisit extends RepSchedule {
  hcp: HCP;
}

// ── API types ───────────────────────────────────────────────────────

export interface DebriefPayload {
  visit_id: string;
  hcp_id: string;
  transcript: string;
}

export interface DebriefResponse {
  success: boolean;
  extracted_data: ExtractedData | null;
  cross_visit_summary: string | null;
  error?: string;
}

export interface SignedUrlResponse {
  signed_url: string;
}
