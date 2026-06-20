# 04 · Database Schema (Supabase / Postgres)

Principles: every shared row carries `couple_id`; **Row Level Security** scopes all reads/writes to the requesting user's couple. TMDB data is cached in `titles` so we never depend on a live API call to render. UUID PKs (except `titles`, keyed by TMDB id + media type).

## Entity overview
```
auth.users ─1:1─ profiles ─M:N (couple_members)─ couples
                                   │
   titles (TMDB cache) ◀──────────┼──── watchlist_items ── votes
                                   ├──── matches
                                   ├──── watch_progress
                                   ├──── ratings
                                   ├──── reviews_notes
                                   ├──── collections ── collection_items
                                   ├──── activity_events
                                   ├──── achievements
                                   └──── discovery_sessions
   invitations (pairing)
```

## Tables

### profiles
Extends `auth.users`. One per person.
| col | type | notes |
|---|---|---|
| id | uuid PK | = auth.users.id |
| display_name | text | |
| avatar_url | text | |
| taste_profile | jsonb | genres, liked_titles, disliked, do_not_want — seeded from Panda's brief |
| onboarding_done | bool | |
| created_at | timestamptz | |

### couples
| col | type | notes |
|---|---|---|
| id | uuid PK | |
| name | text | "Panda & ❤️" |
| created_by | uuid → profiles | |
| created_at | timestamptz | |

### couple_members
Join table (supports 2, future-proof for more).
| col | type | notes |
|---|---|---|
| couple_id | uuid → couples | |
| user_id | uuid → profiles | |
| role | text | owner / member |
| joined_at | timestamptz | |
| PK | (couple_id, user_id) | |

### invitations
Pairing system.
| col | type | notes |
|---|---|---|
| id | uuid PK | |
| couple_id | uuid → couples | |
| inviter_id | uuid → profiles | |
| email | text | optional |
| code | text unique | short shareable code |
| status | text | pending / accepted / expired |
| expires_at | timestamptz | |

### titles  (TMDB cache)
| col | type | notes |
|---|---|---|
| id | text PK | `"movie:603"` / `"tv:66732"` (media_type:tmdb_id) |
| tmdb_id | int | |
| media_type | text | movie / tv |
| title | text | |
| overview | text | |
| poster_path / backdrop_path | text | |
| release_year | int | |
| runtime | int | minutes (avg ep for tv) |
| genres | text[] | |
| vote_average | numeric | |
| popularity | numeric | |
| keywords / mood_tags | text[] | derived for mood matching |
| raw | jsonb | full TMDB payload |
| cached_at | timestamptz | TTL refresh |

### watchlist_items
| col | type | notes |
|---|---|---|
| id | uuid PK | |
| couple_id | uuid → couples | |
| title_id | text → titles | |
| added_by | uuid → profiles | |
| status | text | interested / planning / watching / paused / finished / dropped |
| created_at | timestamptz | |
| UNIQUE | (couple_id, title_id) | one entry per title per couple |

### votes
Each user's reaction to a title (drives the Match).
| col | type | notes |
|---|---|---|
| id | uuid PK | |
| couple_id | uuid → couples | |
| title_id | text → titles | |
| user_id | uuid → profiles | |
| value | text | like / pass / love / seen |
| created_at | timestamptz | |
| UNIQUE | (couple_id, title_id, user_id) | |
> **Match rule:** when both members have a `like`/`love` vote on the same `(couple_id, title_id)`, a trigger inserts into `matches` + emits an activity event.

### matches
| col | type | notes |
|---|---|---|
| id | uuid PK | |
| couple_id | uuid → couples | |
| title_id | text → titles | |
| matched_at | timestamptz | |
| seen_by | uuid[] | who's viewed the match reveal |

### watch_progress
| col | type | notes |
|---|---|---|
| id | uuid PK | |
| couple_id | uuid → couples | |
| user_id | uuid → profiles | nullable = shared/couple-level |
| title_id | text → titles | |
| status | text | watching / paused / finished / dropped / planning |
| season / episode | int | for series |
| updated_at | timestamptz | |

### ratings
| col | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid → profiles | |
| couple_id | uuid → couples | |
| title_id | text → titles | |
| score | numeric | e.g. 0–10 or 0–5 |
| created_at | timestamptz | |
| UNIQUE | (user_id, title_id) | |

### reviews_notes
Private notes + shared comments + mini reviews.
| col | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid → profiles | author |
| couple_id | uuid → couples | |
| title_id | text → titles | |
| body | text | |
| visibility | text | private / shared |
| episode_ref | text | e.g. "S2E3" optional |
| created_at | timestamptz | |

### collections  /  collection_items
| collections | type | | collection_items | type |
|---|---|---|---|---|
| id | uuid PK | | collection_id | uuid → collections |
| couple_id | uuid → couples | | title_id | text → titles |
| name | text | | added_by | uuid |
| kind | text (custom/system) | | added_at | timestamptz |
| created_at | timestamptz | | PK | (collection_id, title_id) |

### activity_events
Powers the shared feed + realtime.
| col | type | notes |
|---|---|---|
| id | uuid PK | |
| couple_id | uuid → couples | |
| actor_id | uuid → profiles | |
| type | text | saved / voted / matched / rated / commented / status_changed / finished / achievement |
| title_id | text → titles | nullable |
| payload | jsonb | type-specific details |
| created_at | timestamptz | |

### achievements
| col | type | notes |
|---|---|---|
| id | uuid PK | |
| couple_id | uuid → couples | |
| key | text | mystery_lovers / weekend_bingers / classic_explorers / thriller_experts … |
| progress | jsonb | counters toward unlock |
| unlocked_at | timestamptz | null = locked/in-progress |

### discovery_sessions
Logs quiz inputs → recommendations (analytics + "why" memory).
| col | type | notes |
|---|---|---|
| id | uuid PK | |
| couple_id | uuid → couples | |
| user_id | uuid → profiles | |
| mood / vibe / era / context / commitment / energy | text | quiz answers |
| result_title_ids | text[] | what we served |
| created_at | timestamptz | |

## Realtime subscriptions
`watchlist_items`, `votes`, `matches`, `activity_events`, `watch_progress` → Postgres `replication` channels, filtered by `couple_id`. Partner sees changes instantly.

## RLS sketch
```sql
-- a user may access a row iff they belong to that couple
create policy "couple members read"
on watchlist_items for select
using (couple_id in (
  select couple_id from couple_members where user_id = auth.uid()
));
-- analogous insert/update/delete policies per table; profiles are self-or-partner readable.
```

## Server-side helpers (Edge Functions / RPC)
- `tmdb_fetch_cache(title_id)` — fetch + upsert into `titles`.
- `record_vote()` — vote + match-detection trigger + activity event.
- `recommend()` — runs the scoring engine (see flows).
- `ai_assistant()` — Claude call with assembled couple context.
