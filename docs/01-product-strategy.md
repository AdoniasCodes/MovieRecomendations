# 01 · Product Strategy

## The real problem
Couples spend more time *deciding* what to watch than watching. Decision paralysis is the enemy. Existing tools (Netflix rows, IMDb, Letterboxd) are built for **one person browsing a catalog**, not **two people negotiating a choice under low energy on a Tuesday night.**

## The wedge
The hook is **collaborative decision-making**, not cataloging. Two mechanics carry the product:

1. **Mood/context-first discovery** — you don't pick a genre, you pick a *feeling* + *situation*. The app translates that into titles.
2. **The Match** — both people react to candidate titles; when both like the same thing, "IT'S A MATCH" ends the negotiation. This is the dopamine moment and the shareable hook.

Everything else (stats, reviews, achievements, AI chat) is retention, not acquisition.

## Positioning
| | Netflix | IMDb | Letterboxd | **MovieMatch** |
|---|---|---|---|---|
| Built for | solo browsing | solo lookup | solo logging/film buffs | **couples deciding together** |
| Entry point | catalog rows | search | your diary | **mood + situation** |
| Killer feature | autoplay | ratings db | reviews/lists | **the Match + shared brain** |
| Vibe | functional | utilitarian | cinephile | **intimate, playful, premium** |

We are not competing on catalog size (TMDB gives everyone the same data). We compete on **the decision experience and the relationship layer.**

## Target users
- **Primary:** Panda + girlfriend (a couple, 2 accounts, 1 shared space).
- **Generalized:** any pair (partners, roommates, long-distance couples, best friends) who watch together — including async ("you watch it, tell me if it's worth it").

## Taste seed (Panda's profile)
Crime · psychological thriller · mystery · detective · dark drama · suspense. Loves: intelligent storytelling, twists, strong characters, dark themes, sharp writing, tension, must-watch classics. Avoids: generic/low-quality, bad romance, predictable plots.
> This seeds the cold-start recommendations so the app feels personal from screen one — no "rate 20 movies" wall before any value.

## Product principles
1. **Decide, don't browse.** Every screen should shorten the path to "press play."
2. **Two brains, one space.** Realtime shared state is the default, not a feature flag. Partner's action appears instantly.
3. **Always explain why.** Every recommendation carries a human-readable reason. Trust comes from transparency.
4. **Low-energy friendly.** The most common state is "tired, can't decide." One-tap paths (Surprise Me, Tonight's Pick, Randomizer) must always be one tap away.
5. **Premium by default.** If an interaction can have a tasteful animation or haptic-feeling transition, it should. Polish is the product.

## Success metrics (for a fun project — what "working" means)
- **Time-to-decision** (open app → "we're watching this") trends down.
- **Match rate** — % of discovery sessions that end in a Match.
- **Return cadence** — opened together on multiple nights/week.
- **Watchlist → watched conversion.**
- The soft metric: *"this is actually fun to use."*

## Build philosophy
Ship a **vertical slice that proves the wedge first**: auth + couple pairing → mood discovery → swipe/match → shared watchlist (realtime). Layer AI, stats, achievements, and recaps after the core loop feels great. (See feature phasing in [06](06-feature-ideas.md).)
