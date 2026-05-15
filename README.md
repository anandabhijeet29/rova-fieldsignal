# Rova — Field Signal Intelligence

Voice-first pharma sales rep companion. ElevenLabs voice agent briefs reps before HCP visits and captures debriefs after. Cross-visit intelligence connects insights across the day. Manager dashboard shows territory intelligence in real-time.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template and fill in your keys
cp .env.example .env.local

# Run Supabase migration (see supabase/ directory)
# Then seed the database with mock data

# Start development server
npm run dev
```

## Architecture

```
[Rep Voice] --> [ElevenLabs Agent (client-side widget)]
                     |
              [Client-side tool callbacks]
                     |
         +-----------+-----------+
         |                       |
  [Prefetch briefing]    [POST /api/debrief]
  (Supabase read +        (save transcript +
   signed URL gen)         Claude extraction +
                           cross-visit summary)
         |                       |
    [Supabase DB] <--------------+
         |
    [Supabase Realtime subscriptions]
         |
    [Manager Dashboard (Next.js)]
```

## Tech Stack

- **Voice:** ElevenLabs Conversational AI SDK
- **Backend:** Supabase (Postgres + real-time)
- **Frontend:** Next.js 16 (App Router)
- **Extraction:** Claude API
- **Tests:** Vitest

## Pages

- `/` — Rep view: 4-visit day timeline with voice widgets
- `/dashboard` — Manager view: territory intelligence + real-time visit tracking

## Testing

```bash
npm test
```
