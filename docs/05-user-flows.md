# 05 · User Flows

## A. First-run & couple pairing
```
Sign up (email) → create profile
   → "Invite your partner" → generate code/link → share
   → (partner) Sign up → "Join with code" → enter code
   → both linked to one couple_id
   → quick taste-seed (skippable; Panda's seed pre-fills)
   → land on Home/Tonight (already populated, no empty state)
```
Edge: if partner hasn't joined yet, app works solo and shows "waiting for partner" affordances; everything backfills to shared space once they join.

## B. Core discovery loop (the wedge)
```
Discover → Mood quiz (Feeling→Together/Alone→Vibe→Era→Commitment→Energy)
   → engine returns ranked deck (each card carries a "why")
   → swipe: Pass / Save / Seen / Like
        ├─ Save  → watchlist (status: interested)
        └─ Like  → vote(like)
   → [Together mode] both react to same deck
        → both Like same title → TRIGGER match
            → MATCH reveal overlay → "Add to tonight?" → watchlist (matched)
```

## C. "Decide for us right now" (low-energy paths)
- **Tonight's Pick:** engine returns 1 best title for current context → accept or reshuffle.
- **Surprise Me:** 1 rec from full eligible pool, ignoring quiz → instant.
- **Randomizer:** random pick from existing watchlist/matches → "spin" animation → result.

## D. Recommendation engine (scoring)
Inputs: quiz answers + `taste_profile` (both partners) + `votes`/`ratings` history + TMDB `vote_average`/`popularity` + curated mood_tags + novelty flags.

```
candidate pool (TMDB discover + cached titles, filtered by era/commitment/media_type)
  score(title) =
      w1 · genre_affinity(taste, title)
    + w2 · vibe_match(vibe → mood_tags)
    + w3 · mood_fit(feeling/energy → pacing, runtime, intensity)
    + w4 · quality(vote_average, critic signal)
    + w5 · popularity_or_hidden_gem (boost gems when "hidden gem" intent)
    + w6 · classic_boost (if "classics we missed" & culturally important & unseen)
    + w7 · couple_overlap (both partners' tastes for Together mode)
    − p1 · already_seen / disliked / do_not_want
    − p2 · recently_shown (avoid repeats)
  → rank, attach human "why" string per title
```
Together mode blends BOTH taste profiles (intersection-weighted) so results please both.

**Why-string generation:** templated baseline ("You picked Dark + Full Attention + Together; because you liked Mindhunter & True Detective…") with optional Claude rewrite for natural phrasing.

## E. Watch tracking
```
Title Detail → Set Status (Planning/Watching/Paused/Finished/Dropped)
   → for series: set Season/Episode
   → updates watch_progress → realtime → partner's Home badge + activity feed
Finished → prompt to Rate + leave note/review (private or shared)
   → updates stats + may unlock achievement
```

## F. Ratings, notes & comments
```
Any title → Rate (score) [private to you, visible to partner as "her rating"]
          → Note: private (lock) OR shared comment
          → Episode-tagged comments ("S2E3 ending floored me")
   → shared comments appear in partner's activity + on the title
```

## G. AI assistant
```
Floating ✦ → chat
   user: "dark hidden-gem thriller for tonight, together"
   → assemble context (both taste profiles, watch history, current watchlist, recent votes)
   → Claude → returns picks + reasons
   → render as result cards → Save / Like / Match directly from chat
```

## H. Stats, achievements, recap
```
Every finish/rate/match → increments couple counters
   → thresholds unlock achievements (animated) 
   → Us tab aggregates → live charts
   → end of year → Yearly Recap story (Wrapped)
```

## Realtime contract (what updates instantly for the partner)
| Action | Partner sees |
|---|---|
| Save/Like a title | watchlist + activity update |
| Both Like same title | **Match** reveal + Matches section |
| Set/*change* watch status | Home "currently watching" badge + feed |
| Rate / shared comment | activity feed entry |
| Unlock achievement | Us tab + feed celebration |
