"use client";

/**
 * VoiceWidget — ElevenLabs Conversational AI widget.
 *
 * Handles both briefing and debrief modes.
 * Uses ConversationProvider + useConversation for voice interaction.
 * Client-side tool execution (D2): browser is always open in demo.
 */

import { useState, useCallback, useRef } from "react";
import {
  ConversationProvider,
  useConversation,
} from "@elevenlabs/react";
import type { DisconnectionDetails } from "@elevenlabs/client";
import type { AgentMode, HCP, BriefingContext } from "@/lib/types";
import {
  buildBriefingPrompt,
  buildBriefingFirstMessage,
  buildDebriefPrompt,
  buildDebriefFirstMessage,
} from "@/lib/prompts";

interface VoiceWidgetProps {
  visitId: string;
  hcp: HCP;
  mode: AgentMode;
  briefingContext?: BriefingContext;
  onDebriefComplete?: (transcript: string) => void;
  onBriefingComplete?: () => void;
}

function VoiceWidgetInner({
  visitId,
  hcp,
  mode,
  briefingContext,
  onDebriefComplete,
  onBriefingComplete,
}: VoiceWidgetProps) {
  const [transcript, setTranscript] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const transcriptRef = useRef<string[]>([]);

  const conversation = useConversation({
    onConnect: () => {
      console.log(`[Rova] ${mode} agent connected`);
      setError(null);
    },
    onDisconnect: (details: DisconnectionDetails) => {
      console.log(`[Rova] ${mode} agent disconnected — reason: ${details.reason}`, details);
      const hadContent = transcriptRef.current.length > 0;

      if (details.reason === "error") {
        // The SDK tells us exactly why it failed
        const closeCode = "closeCode" in details ? details.closeCode : undefined;
        const closeReason = "closeReason" in details ? details.closeReason : undefined;
        const errMsg =
          "message" in details && details.message
            ? details.message
            : "Voice agent disconnected unexpectedly.";
        console.error(`[Rova] disconnect error (code ${closeCode}):`, errMsg);

        // Give actionable advice based on the close code
        let hint = "Please try again.";
        if (closeCode === 1008 && closeReason?.includes("quota")) {
          hint = "Your ElevenLabs quota is exhausted — upgrade your plan or wait for it to reset.";
        } else if (closeCode === 1008) {
          hint = "Check your ElevenLabs agent configuration.";
        } else if (closeCode === 1006 || closeCode === 1001) {
          hint = "Check your internet connection and try again.";
        }

        setError(`${errMsg} ${hint}`);
        return; // Don't advance status on error disconnect
      }

      // Clean disconnect ("agent" ended it or "user" ended it)
      if (mode === "debrief" && hadContent) {
        onDebriefComplete?.(transcriptRef.current.join("\n"));
      }
      if (mode === "briefing") {
        if (hadContent) {
          onBriefingComplete?.();
        } else {
          // Session connected and closed cleanly but agent never spoke —
          // likely a mic/audio pipeline issue on this machine.
          setError(
            "Session ended before the agent could speak. " +
            "Check that your browser has microphone permission and no other app is capturing audio."
          );
        }
      }
    },
    onError: (err) => {
      // onError fires before onDisconnect for fatal errors; log it but
      // let onDisconnect (with reason:"error") set the UI message.
      console.error(`[Rova] ${mode} SDK error:`, err);
    },
    onMessage: (message) => {
      // role: "user" | "agent"  (source is deprecated)
      const label = message.role === "user" ? "Rep" : "Rova";
      if (message.message) {
        const line = `${label}: ${message.message}`;
        transcriptRef.current = [...transcriptRef.current, line];
        setTranscript((prev) => [...prev, line]);
      }
    },
    clientTools: {
      // Client-side tool: debrief completion signal
      debrief_complete: async () => {
        console.log("[Rova] Debrief complete signal received");
        return "Debrief logged successfully";
      },
    },
  });

  const handleStart = useCallback(async () => {
    try {
      setError(null);
      setTranscript([]);
      transcriptRef.current = [];

      // Pre-check microphone permission before touching ElevenLabs.
      // This surfaces "Permission denied" clearly instead of a cryptic WS close.
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch (micErr) {
        const label =
          micErr instanceof DOMException && micErr.name === "NotAllowedError"
            ? "Microphone access denied — allow it in your browser's address-bar permissions."
            : "Microphone unavailable — check system settings.";
        setError(label);
        return;
      }

      // Fetch signed URL
      const urlRes = await fetch("/api/signed-url");
      if (!urlRes.ok) throw new Error("Failed to get signed URL");
      const { signed_url } = await urlRes.json();

      // Build dynamic prompt + first message based on mode.
      // Both "First message" and "System prompt" overrides are enabled
      // in the ElevenLabs agent Security → Overrides config.
      const systemPrompt =
        mode === "briefing" && briefingContext
          ? buildBriefingPrompt(briefingContext)
          : buildDebriefPrompt(hcp);

      const firstMessage =
        mode === "briefing"
          ? buildBriefingFirstMessage(hcp)
          : buildDebriefFirstMessage(hcp);

      // Start the conversation with per-HCP overrides
      conversation.startSession({
        signedUrl: signed_url,
        overrides: {
          agent: {
            prompt: { prompt: systemPrompt },
            firstMessage,
          },
        },
      });
    } catch (err) {
      console.error("[Rova] Start failed:", err);
      setError(
        err instanceof Error ? err.message : "Failed to start voice agent"
      );
    }
  }, [mode, hcp, briefingContext, conversation]);

  const handleStop = useCallback(() => {
    conversation.endSession();
  }, [conversation]);

  const isConnected = conversation.status === "connected";
  const isConnecting = conversation.status === "connecting";

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            {mode === "briefing" ? "Pre-Visit Briefing" : "Post-Visit Debrief"}
          </span>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {hcp.name}
          </h3>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {conversation.isSpeaking && (
            <span className="flex items-center gap-1 text-xs text-emerald-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Speaking
            </span>
          )}
          {conversation.isListening && (
            <span className="flex items-center gap-1 text-xs text-blue-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
              Listening
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        {!isConnected ? (
          <button
            onClick={handleStart}
            disabled={isConnecting}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isConnecting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Connecting...
              </span>
            ) : (
              `Start ${mode === "briefing" ? "Briefing" : "Debrief"}`
            )}
          </button>
        ) : (
          <>
            <button
              onClick={() => conversation.setMuted(!conversation.isMuted)}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                conversation.isMuted
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {conversation.isMuted ? "Unmute" : "Mute"}
            </button>
            <button
              onClick={handleStop}
              className="flex-1 rounded-lg bg-zinc-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-zinc-700 dark:hover:bg-zinc-600"
            >
              End {mode === "briefing" ? "Briefing" : "Debrief"}
            </button>
          </>
        )}
      </div>

      {/* Live transcript */}
      {transcript.length > 0 && (
        <div className="mt-3 max-h-40 overflow-y-auto rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
          <p className="mb-1 text-xs font-medium text-zinc-500">Transcript</p>
          {transcript.slice(-6).map((line, i) => (
            <p
              key={i}
              className={`text-xs leading-relaxed ${
                line.startsWith("Rep:")
                  ? "text-blue-700 dark:text-blue-400"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Wrapped VoiceWidget with ConversationProvider.
 */
export default function VoiceWidget(props: VoiceWidgetProps) {
  return (
    <ConversationProvider>
      <VoiceWidgetInner {...props} />
    </ConversationProvider>
  );
}
