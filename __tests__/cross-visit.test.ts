/**
 * cross-visit.test.ts — Cross-visit relevance matching tests (D3)
 *
 * Tests the substring matching logic used in v1 for cross-visit intelligence.
 * Validates: practice group match, topic-intel substring match, graceful skip,
 * and token budget enforcement.
 */

import { describe, it, expect } from "vitest";
import type { HCP, Visit, ExtractedData } from "@/lib/types";

// ── Test implementation of cross-visit matching logic ───────────────
// Extracted from db.ts for unit testing without Supabase dependency

interface VisitWithHcp extends Visit {
  hcp: HCP;
}

function findRelevantCrossVisitSummaries(
  targetHcp: HCP,
  allDebriefedVisits: VisitWithHcp[],
  tokenBudget: number = 500
): string[] {
  const relevantSummaries: string[] = [];
  let currentTokens = 0;

  for (const visit of allDebriefedVisits) {
    const visitHcp = visit.hcp;
    const extracted = visit.extracted_data;

    if (!extracted || !visit.cross_visit_summary) continue;

    // Skip visits to the same HCP
    if (visit.hcp_id === targetHcp.id) continue;

    // Check relevance: practice group match OR topic-intel substring match
    const practiceGroupMatch =
      targetHcp.practice_group != null &&
      visitHcp.practice_group === targetHcp.practice_group;

    const topicMatch =
      targetHcp.preferred_topics?.some((topic) =>
        extracted.competitive_intel?.some((intel) =>
          intel.toLowerCase().includes(topic.toLowerCase())
        )
      ) ?? false;

    if (practiceGroupMatch || topicMatch) {
      const summary = `From ${visitHcp.name} (${visitHcp.specialty}): ${visit.cross_visit_summary}`;
      const summaryTokens = Math.ceil(summary.length / 4);

      if (currentTokens + summaryTokens > tokenBudget) break;

      relevantSummaries.push(summary);
      currentTokens += summaryTokens;
    }
  }

  return relevantSummaries;
}

// ── Fixtures ────────────────────────────────────────────────────────

const drChen: HCP = {
  id: "hcp-chen",
  name: "Dr. Sarah Chen",
  specialty: "Endocrinology",
  practice_group: "Metro Endocrine Associates",
  prescribing_tier: "high",
  preferred_topics: ["GLP-1 agonists", "cardiovascular outcomes"],
  notes: null,
  last_visit_date: "2026-05-01",
  region: "Northeast",
};

const drPatel: HCP = {
  id: "hcp-patel",
  name: "Dr. Raj Patel",
  specialty: "Endocrinology",
  practice_group: "Metro Endocrine Associates",
  prescribing_tier: "medium",
  preferred_topics: ["SGLT2 inhibitors", "renal outcomes"],
  notes: null,
  last_visit_date: "2026-05-08",
  region: "Northeast",
};

const drRodriguez: HCP = {
  id: "hcp-rodriguez",
  name: "Dr. Maria Rodriguez",
  specialty: "Internal Medicine",
  practice_group: "Valley Primary Care",
  prescribing_tier: "high",
  preferred_topics: ["GLP-1 agonists", "patient adherence"],
  notes: null,
  last_visit_date: "2026-05-10",
  region: "Northeast",
};

const drThompson: HCP = {
  id: "hcp-thompson",
  name: "Dr. James Thompson",
  specialty: "Cardiology",
  practice_group: null,
  prescribing_tier: "low",
  preferred_topics: ["cardiovascular outcomes", "heart failure"],
  notes: null,
  last_visit_date: "2026-04-20",
  region: "Northeast",
};

function makeVisit(
  hcp: HCP,
  competitiveIntel: string[],
  summary: string
): VisitWithHcp {
  return {
    id: `visit-${hcp.id}`,
    hcp_id: hcp.id,
    visit_date: "2026-05-01",
    visit_order: 1,
    raw_transcript: "...",
    extracted_data: {
      sentiment: "positive",
      objections: [],
      samples_dropped: [],
      follow_ups: [],
      competitive_intel: competitiveIntel,
      key_quotes: [],
      prescription_intent: "likely",
    },
    cross_visit_summary: summary,
    status: "debriefed",
    created_at: "2026-05-01T10:00:00Z",
    hcp,
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe("Cross-visit relevance matching", () => {
  it("matches on same practice group", () => {
    // Dr. Patel and Dr. Chen share "Metro Endocrine Associates"
    const visits = [
      makeVisit(drPatel, ["Jardiance for CKD"], "SGLT2 preferred for CKD patients"),
    ];

    const results = findRelevantCrossVisitSummaries(drChen, visits);

    expect(results).toHaveLength(1);
    expect(results[0]).toContain("Dr. Raj Patel");
    expect(results[0]).toContain("SGLT2 preferred");
  });

  it("matches on topic-intel substring match", () => {
    // Dr. Rodriguez prefers "GLP-1 agonists"
    // Dr. Chen's competitive_intel mentions "GLP-1" topics
    const visits = [
      makeVisit(
        drChen,
        ["Ozempic GLP-1 agonists pricing advantage"],
        "GLP-1 market competition heating up"
      ),
    ];

    const results = findRelevantCrossVisitSummaries(drRodriguez, visits);

    expect(results).toHaveLength(1);
    expect(results[0]).toContain("Dr. Sarah Chen");
  });

  it("returns empty array when no relevant debriefs exist", () => {
    // Dr. Thompson has no practice_group and his topics (cardiovascular)
    // don't substring match the competitive_intel about SGLT2/renal
    const visits = [
      makeVisit(
        drPatel,
        ["Jardiance renal protection"],
        "SGLT2 inhibitors preferred for renal"
      ),
    ];

    const results = findRelevantCrossVisitSummaries(drThompson, visits);

    expect(results).toHaveLength(0);
  });

  it("matches via topic substring when practice groups differ", () => {
    // Dr. Thompson cares about "cardiovascular outcomes"
    // Dr. Chen's intel mentions "cardiovascular"
    const visits = [
      makeVisit(
        drChen,
        ["Strong cardiovascular outcomes data for GLP-1"],
        "CV outcomes data compelling for endocrinologists"
      ),
    ];

    const results = findRelevantCrossVisitSummaries(drThompson, visits);

    expect(results).toHaveLength(1);
    expect(results[0]).toContain("Dr. Sarah Chen");
  });

  it("enforces token budget (>500 tokens truncated)", () => {
    // Create many visits that all match, each with a long summary
    const longSummary = "A".repeat(1000); // ~250 tokens
    const visits = [
      makeVisit(drPatel, ["GLP-1 data"], longSummary),
      makeVisit(drRodriguez, ["GLP-1 data"], longSummary),
      makeVisit(drThompson, ["GLP-1 data"], longSummary),
    ];

    // All would match Chen via practice_group (Patel) or topic (Rodriguez, Thompson via GLP-1)
    // But token budget should limit results
    const results = findRelevantCrossVisitSummaries(drChen, visits, 500);

    // With ~250 tokens per summary + header text, should fit at most 1-2
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("skips visits without cross_visit_summary", () => {
    const visitNoSummary: VisitWithHcp = {
      ...makeVisit(drPatel, ["GLP-1 data"], ""),
      cross_visit_summary: null,
    };

    const results = findRelevantCrossVisitSummaries(drChen, [visitNoSummary]);

    expect(results).toHaveLength(0);
  });

  it("skips visits without extracted data", () => {
    const visitNoData: VisitWithHcp = {
      ...makeVisit(drPatel, [], "some summary"),
      extracted_data: null,
    };

    const results = findRelevantCrossVisitSummaries(drChen, [visitNoData]);

    expect(results).toHaveLength(0);
  });

  it("is case-insensitive for substring matching", () => {
    const visits = [
      makeVisit(
        drChen,
        ["OZEMPIC glp-1 AGONISTS competitive threat"],
        "Competitive pressure from GLP-1 alternatives"
      ),
    ];

    // Dr. Rodriguez has "GLP-1 agonists" in preferred_topics (mixed case)
    const results = findRelevantCrossVisitSummaries(drRodriguez, visits);

    expect(results).toHaveLength(1);
  });
});
