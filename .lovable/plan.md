# Build All 8 Features — Phased Rollout

Building all 8 in one shot would be ~25+ new files, 8 new tables, and several edge functions — too large to land safely in a single pass. I'll ship them in 3 phases so each phase is testable before the next.

## Phase 1 — Streamer Identity & Discovery (lowest risk, highest daily use)
1. **Game Backlog / Now Playing** — `streamer_games` table (status: playing/completed/backlog/dropped), profile section, fan filter on Streamers page.
2. **Streamer Setup / Gear Showcase** — `streamer_gear` table (category, item, notes, affiliate link), profile tab.
3. **Chat Command Builder** — `chat_commands` table (trigger, response, cooldown), management page at `/commands`, public read on profile.

## Phase 2 — Live Collaboration
4. **Co-Stream Requests** — `co_stream_requests` table (from, to, scheduled_at, status), inbox UI, notification on request/accept.
5. **Raid / Host System** — `stream_raids` table, "Raid now" button on streamer's own profile while live, animated incoming-raid toast for target's followers.
6. **Stream Squad / Team Finder** — already partially scaffolded (`squad_requests` exists). Build the `/squads` browse + create UI on top of it (roles, rank, timezone, game filters).

## Phase 3 — Highlights & Events
7. **Clip Highlights & Moment Markers** — extend existing `stream_clips`: add `chapter_title`, `timestamp_seconds`, profile "Highlights" tab, searchable by title/game.
8. **Tournament Brackets & Events** — `tournaments` + `tournament_teams` + `tournament_matches` tables, single-elimination bracket generator, registration UI, live match results.

## Technical Notes
- All tables: `GRANT` to authenticated + service_role, RLS on, owner-only writes, public read where appropriate.
- New routes added to `App.tsx`, sidebar entries via `AppSidebar.tsx` + `MobileMoreMenu.tsx`.
- Notifications for co-stream/raid/squad use existing `notifications` table + `send-push-notification` edge function.
- Bracket generation is client-side (no edge function needed for single-elim).
- All UI uses existing semantic tokens — no hardcoded colors.

## Delivery
Each phase ends with a working, navigable set of pages. After you approve, I start Phase 1 immediately and keep going through Phase 3 unless you stop me.
