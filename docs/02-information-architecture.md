# 02 · Information Architecture

## Navigation model
Mobile-first bottom tab bar (becomes a left sidebar on desktop). Five primary destinations + a persistent floating AI button.

```
┌─────────────────────────────────────────────┐
│                  App Shell                    │
│  (auth-gated, couple-scoped, realtime-synced) │
└─────────────────────────────────────────────┘
        │
        ├── 🏠 Home / Tonight        ("what do we watch?")
        ├── 🎭 Discover               (mood quiz → swipe deck)
        ├── ❤️  Watchlist & Matches   (shared, voting, status)
        ├── 📊 Us                     (stats, achievements, activity feed)
        └── 👤 Profile                (taste, account, couple settings)

   ✦ Floating: AI Assistant (chat) — available everywhere
```

## Primary destinations

### 🏠 Home / Tonight
The "I just opened the app, decide for me" screen.
- **Tonight's Pick** hero (one strong rec for the evening + why).
- Quick-action chips: **Surprise Me**, **Randomize from Watchlist**, **Start Discovery**.
- "Continue watching" rail (in-progress shows).
- "It's a Match" rail (titles you both want).
- Partner activity peek ("She added 3 thrillers today").

### 🎭 Discover
The core loop. Two stages:
1. **Mood quiz** — feeling → context (alone/together) → vibe → era → commitment → energy. Skippable; remembers last answers.
2. **Swipe deck** — full-bleed poster cards. Like / Pass / Save / "Seen it". In *Together* mode both partners react to the same deck; matches fire live.

### ❤️ Watchlist & Matches
Shared library, segmented:
- **Matches** (both liked) — top priority section.
- **Saved** (one person interested, awaiting partner vote).
- **By status**: Planning · Watching · Paused · Finished · Dropped.
- Filters: media type, runtime, mood tags, who added it.
- **Collections** (Movies We Loved, Comfort Shows, Best Plot Twists, Must Rewatch).

### 📊 Us
The relationship/retention layer.
- Couple stats (hours together, completed movies/series, shared genres).
- Achievements grid (Mystery Lovers, Weekend Bingers, …).
- **Activity feed** — chronological: saved / rated / finished / commented.
- Yearly Recap entry point (Wrapped-style).

### 👤 Profile
- Personal taste profile (genres, liked titles, do-not-want).
- Watch history & personal ratings/notes.
- Account & couple settings (invite partner, rename couple, leave).

## Title Detail (overlay, reachable from anywhere)
Cinematic sheet/route with backdrop, synopsis, cast, runtime, ratings (TMDB + critics + yours), trailer, **why-recommended** explanation, and actions: Save · Vote · Mark status · Rate · Add note · Ask AI about this.

## Data flow
```
TMDB API ──(server fetch + cache)──▶ titles table ──▶ UI
                                          │
User actions ──▶ Supabase (RLS, couple-scoped) ──▶ Realtime ──▶ Partner's UI (instant)
                                          │
Discovery answers + taste + history ──▶ Recommendation engine ──▶ ranked titles + reasons
                                          │
AI Assistant (Claude) ◀── context (taste, history, watchlist) ──▶ chat + explanations
```

## Cross-cutting concerns
- **Couple scoping:** almost all rows carry a `couple_id`; RLS guarantees you only ever see your couple's data.
- **Realtime:** watchlist, votes, matches, activity, and live watching status subscribe to Postgres changes.
- **Cold start:** Panda's taste seed pre-populates recommendations before any in-app behavior exists.
- **Offline-tolerant reads:** title data is cached so browsing doesn't hammer TMDB.
