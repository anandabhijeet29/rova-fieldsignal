/**
 * CrossVisitCard — Surfaces cross-visit intelligence connections (D4).
 *
 * Shown before a briefing starts to give the rep context from
 * other visits. E.g., "Dr. Patel also mentioned GLP-1 cost concerns."
 */

interface CrossVisitCardProps {
  context: string;
  variant?: "pre-briefing" | "post-debrief";
}

export default function CrossVisitCard({
  context,
  variant = "pre-briefing",
}: CrossVisitCardProps) {
  const isPreBriefing = variant === "pre-briefing";

  return (
    <div
      className={`rounded-lg border p-3 ${
        isPreBriefing
          ? "border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-900/10"
          : "border-indigo-200 bg-indigo-50 dark:border-indigo-900/40 dark:bg-indigo-900/10"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 text-sm" aria-hidden="true">
          {isPreBriefing ? "💡" : "🔗"}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={`text-xs font-semibold ${
              isPreBriefing
                ? "text-blue-800 dark:text-blue-300"
                : "text-indigo-800 dark:text-indigo-300"
            }`}
          >
            {isPreBriefing ? "Connections from today" : "Connections found"}
          </p>
          <p
            className={`mt-1 text-xs leading-relaxed ${
              isPreBriefing
                ? "text-blue-700 dark:text-blue-400"
                : "text-indigo-700 dark:text-indigo-400"
            }`}
          >
            {context}
          </p>
        </div>
      </div>
    </div>
  );
}
