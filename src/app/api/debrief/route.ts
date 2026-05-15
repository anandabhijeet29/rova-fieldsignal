/**
 * POST /api/debrief
 *
 * Save transcript + run Claude extraction + generate cross-visit summary.
 * Handles the full debrief pipeline (Step 3 in eng plan):
 *   1. Save raw transcript, mark status -> 'extracting'
 *   2. Call Claude API with extraction prompt
 *   3. Parse extracted_data JSONB
 *   4. Generate generic cross-visit summary
 *   5. Save everything, mark status -> 'debriefed'
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { logDebrief, markExtracting } from "@/lib/db";
import {
  buildExtractionPrompt,
  buildCrossVisitSummaryPrompt,
} from "@/lib/prompts";
import { createServerClient } from "@/lib/supabase";
import type { DebriefPayload, DebriefResponse, ExtractedData, HCP } from "@/lib/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DebriefPayload;
    const { visit_id, hcp_id, transcript } = body;

    if (!visit_id || !hcp_id || !transcript) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Step 1: Mark as extracting (intermediate status for dashboard — D4)
    await markExtracting(visit_id);

    // Fetch HCP name for prompts
    const db = createServerClient();
    const { data: hcp } = await db
      .from("hcps")
      .select("*")
      .eq("id", hcp_id)
      .single();

    const hcpName = (hcp as HCP)?.name ?? "Unknown HCP";

    // Step 2-3: Extract structured data via Claude
    let extractedData: ExtractedData | null = null;
    try {
      const extractionPrompt = buildExtractionPrompt(transcript, hcpName);

      const extraction = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: extractionPrompt }],
      });

      const rawText =
        extraction.content[0].type === "text"
          ? extraction.content[0].text
          : "";

      // Strip markdown code fences if present
      const jsonText = rawText
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();

      extractedData = JSON.parse(jsonText) as ExtractedData;
    } catch (extractionError) {
      console.error("Extraction failed, saving raw transcript:", extractionError);
      // Continue — save what we have (error handling per eng plan)
    }

    // Step 4: Generate cross-visit summary (D9: pre-computed generic summary)
    let crossVisitSummary: string | null = null;
    if (extractedData) {
      try {
        const summaryPrompt = buildCrossVisitSummaryPrompt(
          transcript,
          extractedData,
          hcpName
        );

        const summary = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 256,
          messages: [{ role: "user", content: summaryPrompt }],
        });

        crossVisitSummary =
          summary.content[0].type === "text"
            ? summary.content[0].text.trim()
            : null;
      } catch (summaryError) {
        console.error("Cross-visit summary generation failed:", summaryError);
        // Non-critical — continue without summary
      }
    }

    // Step 5: Save everything
    await logDebrief(visit_id, transcript, extractedData, crossVisitSummary);

    const response: DebriefResponse = {
      success: true,
      extracted_data: extractedData,
      cross_visit_summary: crossVisitSummary,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Debrief pipeline failed:", error);

    return NextResponse.json(
      {
        success: false,
        extracted_data: null,
        cross_visit_summary: null,
        error: error instanceof Error ? error.message : "Unknown error",
      } as DebriefResponse,
      { status: 500 }
    );
  }
}
