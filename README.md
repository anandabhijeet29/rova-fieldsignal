# Rova — Field Signal Intelligence

Voice-first pharma sales rep companion. ElevenLabs briefs reps before HCP visits and captures debriefs after. Claude extracts structured intelligence. Cross-visit connections surface before each briefing. Manager dashboard shows territory patterns in real-time.

## Quick Start

```bash
npm install
cp .env.example .env.local   # fill in API keys (see Environment section)
npm run dev                   # localhost:3000
```

## Environment Variables

```
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Architecture

```
[Rep Browser]
    |
[ElevenLabs Conversational AI — client-side widget]
    |
    ├── Briefing:  prefetch HCP data + cross-visit context + signed URL (Supabase read)
    └── Debrief:   capture transcript → POST /api/debrief
                          |
                   [Claude API — structured extraction + cross-visit summary]
                          |
                   [Supabase Postgres — visits, rep_schedule, hcps, territory]
                          |
                   [Supabase Realtime — WebSocket subscriptions]
                          |
                   [Manager Dashboard — live territory intelligence]
```

## Pages

| Route | View | Description |
|-------|------|-------------|
| `/` | Rep view | Day timeline with date navigation, visit cards, voice widgets |
| `/dashboard` | Manager view | Metrics strip, Today/History tabs, territory intelligence |

## Rep View Features

- **Date navigation** — `‹ Today ›` arrows to view past/future schedules
- **Active-visit-forward hierarchy** — next actionable visit gets hero treatment; completed visits collapse to slim rows
- **Brief / Debrief** — ElevenLabs voice agent in briefing or debrief mode per visit status
- **Cross-visit intelligence** — connections from prior debriefs surfaced before each briefing
- **Post-debrief confirmation** — "Got it — processing your notes" card so reps can drive away confidently
- **Add visit** — `+` button opens inline form (HCP dropdown + date picker)
- **Missed visit actions** — past unactioned visits show Reschedule (inline date picker) or Skip

## Visit Statuses

`upcoming` → `briefed` → `extracting` → `debriefed` | `skipped` | `rescheduled`

## Tech Stack

| Layer | Tool |
|-------|------|
| Frontend | Next.js 16 (App Router), Tailwind v4 |
| Voice | ElevenLabs Conversational AI SDK (`@elevenlabs/react`) |
| Extraction | Claude API (via `/api/debrief` route) |
| Database | Supabase (Postgres + Realtime) |
| Fonts | Fraunces (headings) + Figtree (body) |

## Key Files

```
src/
├── app/api/debrief/route.ts     # transcript → Claude extraction → Supabase write
├── components/DayTimeline.tsx   # rep schedule, date nav, visit cards, add/reschedule
├── components/DashboardView.tsx # manager metrics, tabs, territory panel
├── components/VoiceWidget.tsx   # ElevenLabs voice agent wrapper
├── components/CrossVisitCard.tsx# pre-briefing connection cards
├── lib/db.ts                    # all Supabase queries + schedule management
├── lib/prompts.ts               # briefing, debrief, and extraction prompts
└── lib/types.ts                 # shared TypeScript types
```

## Design System

See `DESIGN.md` for typography, color semantics, card hierarchy, spacing, and accessibility guidelines.

## Product Context

See `ROVA.md` for full product context: what Rova is, current state, what's next, and known issues.
