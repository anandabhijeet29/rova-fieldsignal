/**
 * extraction.test.ts — Claude extraction prompt quality tests
 *
 * Tests: prompt output parsing, field validation, edge cases.
 * These tests validate the extraction logic without calling the Claude API.
 */

import { describe, it, expect } from "vitest";
import { buildExtractionPrompt } from "@/lib/prompts";
import type { ExtractedData } from "@/lib/types";

// ── Helpers ─────────────────────────────────────────────────────────

function parseExtraction(jsonString: string): ExtractedData | null {
  try {
    const cleaned = jsonString
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();
    return JSON.parse(cleaned) as ExtractedData;
  } catch {
    return null;
  }
}

function validateExtractedData(data: ExtractedData): string[] {
  const errors: string[] = [];

  if (!["positive", "neutral", "negative"].includes(data.sentiment)) {
    errors.push(`Invalid sentiment: ${data.sentiment}`);
  }
  if (!Array.isArray(data.objections)) {
    errors.push("objections must be an array");
  }
  if (!Array.isArray(data.samples_dropped)) {
    errors.push("samples_dropped must be an array");
  }
  if (!Array.isArray(data.follow_ups)) {
    errors.push("follow_ups must be an array");
  } else {
    data.follow_ups.forEach((fu, i) => {
      if (!fu.action) errors.push(`follow_ups[${i}] missing action`);
      if (!fu.due_date) errors.push(`follow_ups[${i}] missing due_date`);
    });
  }
  if (!Array.isArray(data.competitive_intel)) {
    errors.push("competitive_intel must be an array");
  }
  if (!Array.isArray(data.key_quotes)) {
    errors.push("key_quotes must be an array");
  }
  if (!["likely", "unlikely", "unclear"].includes(data.prescription_intent)) {
    errors.push(`Invalid prescription_intent: ${data.prescription_intent}`);
  }

  return errors;
}

// ── Tests ───────────────────────────────────────────────────────────

describe("buildExtractionPrompt", () => {
  it("includes transcript and HCP name", () => {
    const prompt = buildExtractionPrompt(
      "The visit went great...",
      "Dr. Chen"
    );

    expect(prompt).toContain("Dr. Chen");
    expect(prompt).toContain("The visit went great...");
    expect(prompt).toContain("JSON Schema");
  });

  it("includes all required fields in schema", () => {
    const prompt = buildExtractionPrompt("test", "Dr. Test");
    const requiredFields = [
      "sentiment",
      "objections",
      "samples_dropped",
      "follow_ups",
      "competitive_intel",
      "key_quotes",
      "prescription_intent",
    ];

    requiredFields.forEach((field) => {
      expect(prompt).toContain(field);
    });
  });
});

describe("parseExtraction", () => {
  it("parses valid JSON response", () => {
    const validJson = JSON.stringify({
      sentiment: "positive",
      objections: ["cost concerns"],
      samples_dropped: ["Treziva 1.5mg"],
      follow_ups: [{ action: "Send data", due_date: "2026-05-20" }],
      competitive_intel: ["Ozempic mentioned"],
      key_quotes: ["Great meeting"],
      prescription_intent: "likely",
    });

    const result = parseExtraction(validJson);
    expect(result).not.toBeNull();
    expect(result!.sentiment).toBe("positive");
    expect(result!.objections).toHaveLength(1);
  });

  it("handles JSON wrapped in markdown code fences", () => {
    const wrappedJson = '```json\n{"sentiment": "neutral", "objections": [], "samples_dropped": [], "follow_ups": [], "competitive_intel": [], "key_quotes": [], "prescription_intent": "unclear"}\n```';

    const result = parseExtraction(wrappedJson);
    expect(result).not.toBeNull();
    expect(result!.sentiment).toBe("neutral");
  });

  it("returns null for malformed JSON", () => {
    const result = parseExtraction("This is not JSON at all");
    expect(result).toBeNull();
  });

  it("returns null for empty string", () => {
    const result = parseExtraction("");
    expect(result).toBeNull();
  });
});

describe("validateExtractedData", () => {
  it("validates a complete, correct extraction", () => {
    const data: ExtractedData = {
      sentiment: "positive",
      objections: ["insurance coverage"],
      samples_dropped: ["Treziva 1.5mg"],
      follow_ups: [{ action: "Send data", due_date: "2026-05-20" }],
      competitive_intel: ["Ozempic pricing"],
      key_quotes: ["Compelling data"],
      prescription_intent: "likely",
    };

    const errors = validateExtractedData(data);
    expect(errors).toHaveLength(0);
  });

  it("validates extraction with empty arrays (minimal response)", () => {
    const data: ExtractedData = {
      sentiment: "neutral",
      objections: [],
      samples_dropped: [],
      follow_ups: [],
      competitive_intel: [],
      key_quotes: [],
      prescription_intent: "unclear",
    };

    const errors = validateExtractedData(data);
    expect(errors).toHaveLength(0);
  });

  it("catches invalid sentiment value", () => {
    const data = {
      sentiment: "amazing" as ExtractedData["sentiment"],
      objections: [],
      samples_dropped: [],
      follow_ups: [],
      competitive_intel: [],
      key_quotes: [],
      prescription_intent: "unclear" as const,
    };

    const errors = validateExtractedData(data);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("sentiment");
  });

  it("catches follow-up missing required fields", () => {
    const data: ExtractedData = {
      sentiment: "neutral",
      objections: [],
      samples_dropped: [],
      follow_ups: [{ action: "", due_date: "2026-05-20" }],
      competitive_intel: [],
      key_quotes: [],
      prescription_intent: "unclear",
    };

    const errors = validateExtractedData(data);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("action");
  });
});
