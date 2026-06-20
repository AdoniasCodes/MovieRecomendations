# 03 · Screen Designs

Design language: **dark-mode-first**, near-black layered surfaces, glassmorphism on floating elements, one cinematic accent gradient, poster-forward imagery, generous spacing, large confident typography, Framer Motion on every transition. Mobile-first; scales up to a sidebar layout on desktop.

Visual tokens (starting point):
- Surfaces: `#0A0A0B` base → `#141417` raised → glass `rgba(255,255,255,0.06)` + blur.
- Accent: a violet→magenta cinematic gradient (`#7C3AED → #DB2777`) used sparingly for primary actions, matches, focus.
- Text: high-contrast white / 70% / 45% tiers. Type: a refined geometric sans (e.g. Geist/Inter tight) with large tracking on headers.
- Radii: 16–24px cards, pill buttons. Shadows: soft, colored by accent on hover.

---

## 1. Onboarding / Auth
- Full-bleed cinematic gradient + subtly drifting poster collage behind frosted glass card.
- Email sign-up/login (Supabase). Minimal fields.
- Post-signup: **couple pairing** — "Invite your partner" (share a code/link) or "Join with a code." Warm, two-avatars-becoming-one visual.
- **Taste seed step:** quick, playful chips for genres + a few "have you seen these?" poster taps. Skippable (Panda's seed pre-fills).

## 2. Home / Tonight
- **Tonight's Pick** hero: large backdrop, title, runtime, a one-line *why*, big "Watch Tonight" + "Not feeling it" (reshuffle) buttons.
- Quick-action chips row: **✦ Surprise Me · 🎲 Randomize · 🎭 Start Discovery**.
- Horizontal rails: Continue Watching · It's a Match · Hidden Gems for You · Classics You've Missed.
- Partner peek card (glass): avatar + "She saved *Prisoners* 2h ago."
- Micro-interactions: rails snap-scroll, posters tilt on hover (desktop), parallax backdrop.

## 3. Discover — Mood Quiz
- One question per step, big tappable cards, progress dots, smooth slide transitions.
- Sequence: Feeling → Alone/Together → Vibe → Era → Commitment → Energy.
- "Together" mode: prompt to make sure both phones/the session is shared.
- Ends with a satisfying "Finding your picks…" loader (shuffling posters animation).

## 4. Discover — Swipe Deck
- Full-bleed poster card, stacked deck behind. Drag/swipe or buttons: **Pass ✕ · Save ☆ · Seen 👁 · Like ❤️**.
- Card front: poster + title + year + runtime + vote badge. Tap/flip → synopsis + **why this** + top cast.
- **Together mode:** both react to the same ordered deck. When both Like the same title → **MATCH overlay** (confetti/glow, the two avatars, "Add to tonight?" CTA).
- Haptic-style scale/spring feedback on every action; undo last swipe.

## 5. Title Detail
- Cinematic backdrop header fading into content. Poster, title, meta, ratings cluster (TMDB / critics / Panda's / partner's).
- **Why recommended** callout (AI-written, references your taste).
- Trailer embed, cast strip, "More like this."
- Action bar (sticky): Save · Vote · Set Status · Rate · Note · **Ask AI about this**.
- Reviews/notes section: private notes (lock icon) + shared comments (both avatars, threaded-ish), episode-tagged.

## 6. Watchlist & Matches
- Segmented control: **Matches · Saved · Watching · Finished · …**
- Matches section visually elevated (accent border/glow, "you both want this").
- Grid of poster cards with status pills + who-added avatar. Long-press/hover → quick actions.
- Vote affordance on Saved items ("waiting on her vote"). Filters & sort drawer.
- Collections shelf at top (custom shared lists).

## 7. Us (Stats / Achievements / Activity)
- **Stats hero:** big numbers (hours together, titles completed) with animated count-up and a small chart (genre breakdown donut, watch streak).
- **Achievements grid:** badges, locked = silhouette, unlock animation (shimmer + pop).
- **Activity feed:** timeline cards — "She rated *Severance* ★★★★★", "You both matched on *Fargo*", with relative timestamps and reactions.

## 8. AI Assistant (floating chat)
- Glass sheet sliding from bottom. Conversational.
- Prompt suggestions: "Recommend something like Mindhunter", "Dark movie for tonight", "Hidden gem thriller", "Best 90s crime show".
- Replies render as **rich result cards** (mini posters + why) the couple can Save/Match directly from chat, not just text.

## 9. Live Watching Status
- Lightweight: from a title, set "Watching S2E4 / Paused / Finished". Partner sees it live in activity + a "Currently watching" badge on Home.

## 10. Yearly Recap (Wrapped) — later phase
- Full-screen vertical story slides, auto-advancing, shareable cards: top genres, total hours, biggest binge, "your most-rated", "your match of the year."

---

### Signature micro-interactions to nail
- The **Match reveal** (the money moment) — must feel celebratory and premium.
- Swipe spring physics + undo.
- Count-up stats and achievement unlocks.
- Page/route transitions via shared-element poster morphs (poster in a rail → expands into Title Detail).
