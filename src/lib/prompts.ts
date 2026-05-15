/**
 * Centralized prompts module (D7).
 * All ElevenLabs system prompts and Claude extraction prompts live here.
 * Faster iteration during prompt tuning sessions.
 */

import type { BriefingContext, HCP, Visit, ExtractedData } from "./types";

// ── ElevenLabs Agent Prompts ────────────────────────────────────────

/**
 * System prompt for pre-visit briefing mode.
 * Agent proactively briefs the rep on the upcoming HCP visit.
 */
export function buildBriefingPrompt(context: BriefingContext): string {
  const { hcp, priorVisits, crossVisitContext, territory } = context;

  const priorVisitSummary = priorVisits.length > 0
    ? priorVisits
        .map((v) => {
          const data = v.extracted_data;
          if (!data) return `  - ${v.visit_date}: No debrief recorded`;
          return [
            `  - ${v.visit_date}: Sentiment ${data.sentiment}`,
            data.objections.length > 0 ? `    Objections: ${data.objections.join(", ")}` : null,
            data.competitive_intel.length > 0 ? `    Competitive intel: ${data.competitive_intel.join(", ")}` : null,
            data.follow_ups.length > 0 ? `    Open follow-ups: ${data.follow_ups.map(f => f.action).join(", ")}` : null,
          ].filter(Boolean).join("\n");
        })
        .join("\n")
    : "  No prior visits recorded.";

  const crossVisitSection = crossVisitContext
    ? `\n## Cross-Visit Intelligence\nInsights from other recent visits that may be relevant:\n${crossVisitContext}\n`
    : "";

  const territorySection = territory
    ? `\n## Territory Intelligence (${territory.region})\n` +
      `Trending objections: ${territory.trending_objections.map(o => o.objection).join(", ")}\n` +
      `Top competitive mentions: ${territory.competitive_mentions.map(c => c.competitor).join(", ")}\n`
    : "";

  return `You are Rova, a voice-first pharma sales intelligence companion. You are briefing a sales rep before they visit an HCP (healthcare provider).

## Your Role
- Proactively brief the rep on the upcoming visit — don't wait for questions
- Be concise and actionable — the rep is likely driving
- Highlight what's changed since the last visit
- Flag potential objections and suggest talking points
- Mention any relevant competitive intelligence

## HCP Profile
Name: ${hcp.name}
Specialty: ${hcp.specialty}
Practice Group: ${hcp.practice_group || "Independent"}
Prescribing Tier: ${hcp.prescribing_tier}
Preferred Topics: ${hcp.preferred_topics.join(", ")}
Notes: ${hcp.notes || "None"}
Last Visit: ${hcp.last_visit_date || "First visit"}

## Prior Visit History
${priorVisitSummary}
${crossVisitSection}${territorySection}
## Instructions
1. Start by greeting the rep and naming the HCP they're about to visit
2. Give a 30-second overview: key facts, last interaction highlights, any open follow-ups
3. Highlight what to watch for: likely objections based on history and territory trends
4. Suggest 1-2 talking points tailored to this HCP's interests
5. Ask if the rep has any questions before the visit
6. Keep it natural and conversational — you're a trusted colleague, not a report reader

When the rep indicates they're ready, wish them good luck and end the briefing.`;
}

/**
 * First message for briefing mode — the agent speaks first.
 */
export function buildBriefingFirstMessage(hcp: HCP): string {
  return `Hey! You're heading to see ${hcp.name} next — ${hcp.specialty} at ${hcp.practice_group || "their practice"}. Let me bring you up to speed.`;
}

/**
 * System prompt for post-visit debrief mode.
 * Agent captures structured data from the rep's natural language debrief.
 */
export function buildDebriefPrompt(hcp: HCP): string {
  return `You are Rova, a voice-first pharma sales intelligence companion. You are debriefing a sales rep after they visited ${hcp.name} (${hcp.specialty}).

## Your Role
- Capture a thorough debrief through natural conversation
- Ask targeted follow-up questions to fill gaps
- Be encouraging but thorough — get the details that matter

## What to Capture
1. **Overall sentiment** — How did the visit go? (positive / neutral / negative)
2. **Objections raised** — Any pushback on the product, pricing, guidelines?
3. **Samples dropped** — Which product samples were left?
4. **Follow-up actions** — Anything the rep promised to do next?
5. **Competitive intelligence** — Did the HCP mention any competitors?
6. **Key quotes** — Any memorable things the HCP said?
7. **Prescription intent** — Is the HCP likely to prescribe? (likely / unlikely / unclear)

## Instructions
1. Start by asking how the visit went overall
2. Listen to the rep's natural debrief
3. Ask 2-3 targeted follow-up questions to fill gaps from the list above
4. Confirm the key takeaways back to the rep
5. When complete, signal that you have everything needed

Keep it conversational and quick — the rep has their next visit coming up. Don't interrogate; have a natural post-visit chat.

When the debrief feels complete, say "Great, I've got everything. I'll get this logged for you." and call the debrief_complete tool.`;
}

/**
 * First message for debrief mode.
 */
export function buildDebriefFirstMessage(hcp: HCP): string {
  return `How did it go with ${hcp.name}? Give me the highlights.`;
}

// ── Claude Extraction Prompt ────────────────────────────────────────

/**
 * Prompt for Claude to extract structured data from a raw debrief transcript.
 */
export function buildExtractionPrompt(
  transcript: string,
  hcpName: string
): string {
  return `Extract structured data from this pharma sales rep debrief transcript about a visit to ${hcpName}.

## Transcript
${transcript}

## Instructions
Extract the following fields from the transcript. Use the exact JSON schema below.
If a field is unclear or not mentioned, use reasonable defaults:
- sentiment: "neutral" if ambiguous
- arrays: empty [] if nothing mentioned
- prescription_intent: "unclear" if not discussed

Return ONLY valid JSON, no markdown formatting, no explanation.

## JSON Schema
{
  "sentiment": "positive" | "neutral" | "negative",
  "objections": ["string"],
  "samples_dropped": ["string"],
  "follow_ups": [{ "action": "string", "due_date": "string" }],
  "competitive_intel": ["string"],
  "key_quotes": ["string"],
  "prescription_intent": "likely" | "unlikely" | "unclear"
}`;
}

/**
 * Prompt for Claude to generate a generic cross-visit summary (D9).
 * Pre-computed at write time — the consuming briefing prompt contextualizes.
 */
export function buildCrossVisitSummaryPrompt(
  transcript: string,
  extractedData: ExtractedData,
  hcpName: string
): string {
  return `Generate a 2-3 sentence summary of this pharma sales visit to ${hcpName} that could be useful context for visits to OTHER doctors. Focus on competitive intelligence, market sentiment, and objection patterns that might apply broadly.

## Extracted Data
${JSON.stringify(extractedData, null, 2)}

## Raw Transcript (for additional context)
${transcript}

## Instructions
Write a concise, generic summary that would help a rep prepare for a visit to a different HCP in a related specialty or practice group. Don't reference ${hcpName} by name — focus on the insights, not the source.
Return only the summary text, no formatting.`;
}
