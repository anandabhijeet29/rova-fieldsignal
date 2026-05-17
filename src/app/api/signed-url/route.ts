/**
 * GET /api/signed-url
 *
 * Generate a short-lived ElevenLabs signed URL (D5).
 * Keeps the API key server-side — the client never sees it.
 */

import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!apiKey || !agentId) {
    return NextResponse.json(
      { error: "ElevenLabs configuration missing" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("ElevenLabs signed URL error:", response.status, errorBody);
      return NextResponse.json(
        { error: "Failed to generate signed URL", status: response.status, detail: errorBody },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({ signed_url: data.signed_url });
  } catch (error) {
    console.error("Signed URL generation failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
