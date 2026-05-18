# Rova Design System

## Typography

**Display / Headings:** Fraunces (variable serif)
- App title, section headings, stat numbers, HCP names
- Weights: 600 (section headings), 700 (stat numbers, app title)
- Optical size axis enabled for natural scaling

**Body / UI:** Figtree (geometric sans-serif)
- Body text, labels, metadata, buttons, badges, tags
- Weights: 400 (body), 500 (labels/buttons), 600 (emphasis)

**Mono:** Geist Mono
- Transcript text, code, debug info

## Color Semantics

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| **Primary CTA** | `blue-600` | `blue-500` | Brief/Debrief buttons, links, interactive focus |
| **Success** | `emerald-600` | `emerald-500` | Complete badge, positive sentiment, Rx intent likely |
| **Warning** | `amber-600` | `amber-500` | Processing/extracting state, objection tags |
| **Error** | `red-600` | `red-500` | Error banners, negative sentiment, Rx intent unlikely |
| **Competitive** | `orange-600` | `orange-400` | Competitive intel tags (distinct from objection amber) |
| **Neutral** | `zinc-500` | `zinc-400` | Upcoming badge, metadata text, borders |
| **Surface primary** | `white` | `zinc-900` | Active/primary cards, elevated surfaces |
| **Surface secondary** | `zinc-50` | `zinc-900/60` | Completed/history cards, flat surfaces |
| **Background** | `zinc-50` | `zinc-950` | Page background |
| **Text primary** | `zinc-900` | `zinc-100` | Headings, HCP names, primary content |
| **Text secondary** | `zinc-500` | `zinc-400` | Labels, metadata, timestamps |

**Rule:** Emerald is NEVER used for CTAs. Blue is NEVER used for status badges. This prevents the "does green mean done or do this?" confusion.

## Card Hierarchy

**Primary (elevated):** Active visit, today's visit details, voice widget
- `rounded-xl border shadow-sm` with subtle left accent border
- Full padding: `p-4`
- Active visit gets accent left border: `border-l-4 border-l-blue-500`

**Secondary (flat):** Completed visits, history items, territory panels
- `rounded-lg border border-zinc-200 dark:border-zinc-800`
- No shadow, no accent
- Compact padding: `px-4 py-3`

**Stat metric (inline):** Dashboard summary numbers
- Inline horizontal strip, not individual cards
- Label + value pairs separated by dividers
- No individual borders or shadows

## Spacing

Tailwind default 4px base. Key patterns:
- Section gap: `space-y-6` (24px)
- Card gap: `space-y-3` (12px)
- Inner card padding: `p-4` (16px) primary, `px-4 py-3` secondary
- Tag gap: `gap-1.5` (6px)
- Button padding: `px-4 py-2.5` (minimum 44px touch target height)

## Responsive Breakpoints

- **Mobile (< 768px):** Single column. Stat strip stacks to 2x2 grid. Territory intelligence stacks to single column. Bottom tab bar for dashboard navigation.
- **Desktop (>= 768px):** Full layout. Stat strip inline. Territory 3-column grid. Top tab navigation.

## Touch Targets

All interactive elements minimum 44px tap target:
- Buttons: `py-2.5` minimum
- Badge/tag clicks (if interactive): `py-1.5` with 8px hit area padding
- Navigation links: `py-2` minimum

## Accessibility

- Semantic landmarks: `<main>`, `<nav>`, `<header>`
- Skip-to-content link on every page
- `aria-label` on all icon-only buttons and decorative status indicators
- Visible focus rings: `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`
- Color contrast: minimum 4.5:1 on body text, 3:1 on large text
- Status communicated by text + color (never color alone)

## Status Badge Patterns

| Status | Icon | Color | Label |
|--------|------|-------|-------|
| Upcoming | `○` | neutral (zinc) | "Upcoming" |
| Briefed | `◐` | info (blue) | "Briefed" |
| Processing | `⟳` | warning (amber) | "Processing" |
| Complete | `●` | success (emerald) | "Complete" |

## Empty State Pattern

Every empty state includes:
1. **Warmth:** Friendly message (not "No data found")
2. **Context:** Why it's empty and when it won't be
3. **Action:** Primary action to resolve (if applicable)

Example: "No visits scheduled for today" becomes "Your day starts when you import a schedule. Drop a CSV or add visits manually."

## Theme

Three modes stored in localStorage:
- **System** (default): follows `prefers-color-scheme`
- **Light:** forced light
- **Dark:** forced dark

Toggle icon in header: sun (light) / moon (dark) / monitor (system).
