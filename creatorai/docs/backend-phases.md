# CreatorAi: Backend Execution Plan (phase-wise)

Built from the "Bit N Build" PDF (Master Build Doc, sections 2, 6, 8, 10, 11, 12) and the code that already exists in `creatorai/`.
Scope: backend only, on the existing Next.js 14 app. Frontend work that touches these phases is listed under "Frontend adapts" so the two stay aligned.

---

## Status (updated 2026-10-03)

| Phase | State |
|---|---|
| B0 | Done. `lib/server/{http,demo}.ts` (shared with B3/B4), `lib/schemas/{job,groups}.ts`, `lib/server/jobStore.ts`, `lib/api/client.ts`, `.env.example`, `/health`, `/demo/{reset,groups,scenarios}`, first `BACKEND-SLOT` markers |
| B1 | Done. `lib/server/jobs.ts` (job progress derived from timestamps, so no timers and it survives refresh), `GET /jobs/:id`, `/jobs/:id/stream` (SSE), `POST /jobs/:id/cancel`, `lib/api/jobs.ts` (`watchJob`) |
| B2 | Done except hashing. `POST /groups/match`, `POST /groups/:id/generate` (Idempotency-Key, `alreadyGenerated`, `force`), `GroupService` demo/live, Upload page routed through `groupService`. **Open:** real SHA-256 hashes need the 15 sample files in `public/demo/g1..g5/`, then `npm run hash-demo` |

| B5 | Done. Data-driven rule engine (`lib/precheck.ts` + `fixtures/rules/{ig,yt,linkedin,x}.json`), `POST /projects/:id/{prepublish,audio/swap,approve,publish}`, `/prepublish` and `/publish` clipId aliases, `GET /published-posts`, idempotent publish job, `PrecheckService` and `PublishService` demo/live (Review screen not rewired yet) |
| B6 | Done. `GET /projects/:id/thumbnails`, `POST /thumbnails/score` (shared with the browser via `lib/thumbScore.ts`), `POST /projects/:id/align`, `/clips/generate`, `POST /clips/:id/render` (pre-baked file, says when edits were not rendered) |

B5/B6 notes: rules for resolution, codec/file size, safe-zone text, alt text and third-party visuals are not implemented because the project carries no data for them (nothing is faked). LinkedIn and X audio items now name their own rights process instead of Meta. `next.config.mjs` honours `NEXT_DIST_DIR` so sessions and smoke tests can build side by side. 46 tests pass.

Deviations from the plan below: jobs/generations/idempotency live in `.data/jobs.json` (`lib/server/jobStore.ts`), not one `repo.ts`, because the B3 session owns `lib/server/projectRepo.ts` on `.data/db.json`. A finished generate job inserts its project through `projectRepo`. `POST /demo/reset` resets both stores. Tests: `npm test` (23 tests in `tests/`).

---

## 0. What the backend is building on (existing code)

The frontend already has a service layer and several pieces of backend logic written as pure TypeScript. The plan **reuses** them instead of rewriting.

| Existing file | What it is | Backend plan |
|---|---|---|
| `lib/match.ts` (`matchFiles`, `score`) | Group matching, hash > filename > duration, ties, dedupe, `_default` | Move to server-safe core, call from `POST /groups/match` |
| `lib/precheck.ts` (`precheck`) | Rule engine over a `Project` | Same: call from `POST /projects/:id/prepublish`; split rules into per-platform JSON |
| `lib/projects.ts` (`makeProject`, `seedTimeline`, `normalize`) | Project and timeline construction | Used by `generate` to create the project row |
| `lib/types.ts` | `Group`, `Project`, `Segment`, `MatchResult`, `CalendarItem` | **This is the contract.** Zod schemas are derived from it, not the PDF's EDL type |
| `lib/services/{types,demo,live,index}.ts` | `ClipService`, `CaptionService`, demo/live switch with silent fallback | Add one live implementation per service; keep the fallback rule |
| `app/api/v1/captions/generate/route.ts` | Only real route today: Gemini, 3.8 s timeout, fixture fallback | Template for every other LLM route |
| `lib/store.ts` (Zustand, persisted `creatorai-v1`) | Projects, calendar, notices, permissions live **only in the browser** | Becomes a cache; server becomes source of truth in B3 and later |
| `fixtures/*.json` | groups, captions, rules, audioCatalog, platformProfiles, analytics, audience, home, creators, scripts | Served by routes; moved behind a repository interface in B0 |

Gaps against the PDF (backend must fill): no `/api/v1` routes other than captions, no job model or SSE, no persistence, no idempotency on publish (a ref guard only), no `rules` split per platform, empty hashes in `groups.json`, `public/demo/` has no media.

---

## 1. Decisions made up front (change here, not mid-build)

1. **Contract = existing TS types.** The PDF's EDL (`tracks.video/captions/overlays/audio`, `reframe`) and the existing `Segment[]` timeline describe the same thing. Keep `Segment[]` as the stored form. Expose the PDF's EDL shape through one adapter (`toEdl(project)` / `fromEdl(edl)`) so the Remotion editor and any later PATCH `/edl` can use either. Do not migrate the frontend.
2. **One framework.** All routes are Next.js route handlers under `app/api/v1/**`. No separate Express/FastAPI unless the optional media worker (B8) is built.
3. **Storage behind an interface.** `lib/server/repo.ts` exposes `projects`, `jobs`, `calendar`, `permissions`, `publishedPosts`, `idempotency`. First implementation is in-memory plus a JSON file at `.data/db.json` (works locally and on a laptop demo). Swap for SQLite/Prisma only if needed. On Vercel the filesystem is read-only, so for hosted demos use in-memory plus `seed` on cold start; say so in the pitch.
4. **Two source of truth rules.** Seed data comes from `fixtures/`. Runtime data (projects, calendar, posts) lives in the repo. `POST /demo/reset` re-seeds the repo.
5. **Pure core, thin routes.** Business logic goes in `lib/server/**` as pure functions (no `Request`). Routes only parse (Zod), call, and format. This keeps the logic unit-testable and lets the client keep using the same function in demo mode.
6. **Job stream path:** `GET /api/v1/jobs/:id/stream` (SSE), as in the PDF. If the frontend pair uses `/events`, add an alias route rather than renaming.
7. **Never claim certainty.** Copyright output is risk, reason, fix, plus the disclaimer string from `rules.json`. Missing metrics return `null` with `available: false`, never `0`. Estimates carry `estimated: true`.

### Conventions (frontend relies on these)

- **Error shape** (both pairs agreed): `{ "error": { "code": "VALIDATION_FAILED", "message": "...", "details": [] } }` with correct HTTP status. Codes: `VALIDATION_FAILED`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `UPSTREAM_TIMEOUT`, `INTERNAL`.
- **Job shape:** `{ id, status: "queued|running|done|failed", progress: 0..1, steps: [{ key, label, status }], result? }`. Async actions return `202 { jobId }`.
- **IDs** are strings, dates ISO-8601 UTC, display timezone is a client concern (IST default).
- **Idempotency:** mutating POSTs that must not double-fire (`publish`, `generate`) accept an `Idempotency-Key` header; the same key returns the stored response.
- **Demo controls:** every route reads the demo state (forced scenario, slow network multiplier, fake "now") from headers `x-demo-scenario`, `x-demo-slow`, `x-demo-now`, set by the existing Demo Panel/store. Routes never call `Date.now()` directly; they call `now(req)`.
- **Env flags** (all optional, app boots with none): `DEMO_MODE` (default `true`), `SERVICE_<NAME>=demo|live`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `MEDIA_WORKER_URL`. Existing client flags `NEXT_PUBLIC_SERVICE_*` and `NEXT_PUBLIC_DEMO_MODE` stay as they are.
- **Fallback rule:** any live call that errors or exceeds 4 s returns the fixture result with `source: "demo"`. Judges never see an error.
- **Grep marker:** every spot the frontend or backend swaps carries `// BACKEND-SLOT(id)`. Today there are none; B0 adds them (see section 4).

---

## 2. Phases

Each phase lists tasks, files, endpoints, **Frontend adapts**, and an **Exit** you can test.

### B0: Skeleton, contracts, repository (do first, everything depends on it)

Tasks
- `lib/server/http.ts`: `ok()`, `fail(code, status, message, details)`, `withRoute(handler)` wrapper that catches throws and returns the agreed error shape; `parse(schema, input)` using Zod.
- `lib/server/demo.ts`: `now(req)`, `slowMs(req, ms)`, `forcedScenario(req)`, `isDemo(service)` (reads the same precedence as `lib/services/index.ts`: panel, `SERVICE_<NAME>`, `DEMO_MODE`).
- `lib/server/repo.ts` + `.data/` JSON adapter; `seed()` loads `fixtures/*` and `store.ts` seed projects/calendar.
- `lib/schemas/*.ts` (Zod, inferred from `lib/types.ts`): `project`, `groups`, `job`, `captions`, `thumbnails`, `prepublish`, `publish`, `calendar`, `permissions`. One schema file per domain; export types so `lib/types.ts` can re-export them over time.
- Zod 4 is installed; use `z.strictObject` on request bodies.
- `GET /api/v1/health` and `POST /api/v1/demo/reset`, `GET /api/v1/demo/scenarios`, `GET /api/v1/demo/groups`.
- Add `.env.example` and `.data/` to `.gitignore`.
- Add `// BACKEND-SLOT(id)` comments at the existing swap points (`lib/services/index.ts`, `lib/store.ts` project actions, Review publish).

Frontend adapts: none required. Add a tiny `lib/api/client.ts` (fetch + Zod parse + `ApiError`) that all live services use.

Exit: `curl /api/v1/health` returns ok; `curl -X POST /demo/reset` re-seeds; a deliberately bad body returns the agreed error shape with 400; `grep -r BACKEND-SLOT` lists the planned ids.

### B1: Jobs and SSE (shared by generate, render, publish, align)

Tasks
- `lib/server/jobs.ts`: create job from a `JobStep[]` (reuse `generationSteps(g)` and the publish steps now in Review), advance on timers, store in repo so a refresh resumes.
- `GET /jobs/:id` (snapshot) and `GET /jobs/:id/stream` (SSE: `event: step`, `event: done`, `event: error`; sends the current state first so reconnects resume).
- Honour slow-network multiplier from `x-demo-slow`.
- Cancel: `POST /jobs/:id/cancel`.

Frontend adapts: add `useJobStream(jobId)` in `lib/api/jobs.ts`. Demo mode keeps calling `runJob` locally; live mode opens `EventSource`. Same return type as `JobProgress` in `lib/services/types.ts`, so `UploadWorkspace` and Review do not change.

Exit: create a job, watch steps stream with `curl -N`, kill and reconnect mid-job and see it resume at the same step.

### B2: Group Scenario Engine (match + generate), the demo's core

Tasks
- `POST /groups/match`: body `{ files: [{ name, size, sha256First1MB, durationSec, kind }] }`. Server calls the existing `matchFiles`. Return `MatchResult` unchanged (it already has `candidates`, `missingRoles`, `isDefault`, `duplicates`, `unused`).
- Align match tolerance with the PDF: `lib/match.ts` uses ±0.3 s; the PDF mentions both ±0.3 s (group engine) and ±3 s (single-file manifest). Keep ±0.3 s for group roles, add the ±3 s fallback only to single-file `manifest.json` matching.
- Tie handling: return `candidates` and let the client send the chosen `groupId` to `generate`.
- `POST /groups/:id/generate`: body `{ useDefaultsForMissing?, files? }`, header `Idempotency-Key`. Creates a project via `makeProject(group)`, copies the group timeline (so edits never mutate the seed), creates the job, returns `202 { jobId, projectId }`. Re-uploading the same group within a session returns the existing project with `alreadyGenerated: true` (PDF edge case); `{ force: true }` generates again.
- `_default` group when nothing matches (already in `groups.json`).
- Fill real hashes: run `scripts/hash-demo.mjs` over the 15 sample files and write the SHA-256 (first 1 MB) into `groups.json`. Right now every hash is `""`, so only filename and duration matching works. Put the 15 H.264 MP4s in `public/demo/g1..g5/` (or keep the existing "gradient storyboard" fallback).
- Unit tests for `matchFiles`: all 5 groups, shuffled order, 2 of 3, mixed groups, tie, renamed file (hash only), duplicates, nothing matches.

Frontend adapts: `UploadWorkspace` calls `groupService.match()` and `clipService.generate()`; today it calls `matchFiles` and `runJob` directly. Add `GroupService` to `lib/services/types.ts` with demo (current code) and live (fetch) implementations. After generate, the Studio list gets the new project from the server (`['studio','items']` refetch), not only from Zustand.

Exit: for each of g1..g5, posting its 3 fingerprints in any order returns full match and a project; a 2-file post returns `missingRoles`; a mixed set returns tied `candidates`; an unknown file returns `isDefault: true`.

### B3: Projects, Studio list, EDL persistence

Tasks
- `GET /studio/items?sort=createdAt&status&type&q&platform&from&to`: filter and sort server-side from the repo. Row fields match the PDF (`projectId, title, type, thumbUrl, groupId, generatedAt, updatedAt, status, platforms`).
- `GET /projects/:id` returns `{ project, edl, renders }` (`edl` produced by `toEdl`).
- `PATCH /projects/:id/edl` (and a `PATCH /projects/:id` for caption, thumb, platforms, aspect, audioId). Optimistic concurrency: body carries `version`; mismatch returns `409 CONFLICT` with the current project. Every save bumps `version` and `updatedAt`.
- `POST /projects` (manual create) and `DELETE /projects/:id`, `POST /projects/:id/duplicate` (Studio row actions in the PDF).
- Edit history: store the last N EDL snapshots per project (`GET /projects/:id/history`) so the frontend's undo/redo and "Reset AI suggestion" can survive a refresh. `Segment.ai` already holds the original AI values.

Frontend adapts: `lib/store.ts` project actions (`patchProject`, create) become calls to a `ProjectService` (demo: current Zustand code; live: fetch plus the cache). Studio and Review keep reading `projects`; only the write path changes. Add the `version` field to every patch call.

Exit: create via generate, list shows it at the top, edit a caption through PATCH, reload and the edit survives, a stale `version` returns 409.

### B4: LLM paths (captions, hooks, script, bio, trend ideas)

Tasks
- Refactor `captions/generate/route.ts` into `lib/server/llm.ts`: one `generateJson(schema, prompt, fixture)` helper doing Gemini JSON mode, Zod validation, truncate to platform limits, retry once, then fixture, 4 s overall timeout (the current route uses 3.8 s; keep one constant).
- Endpoints: `POST /projects/:id/captions/suggest` (alias of `/captions/generate`, adds `hashtags[]` and `language`; Hinglish tone supported), `POST /ai/hooks`, `POST /ai/script`, `POST /trends/ideas` (meme concepts, Reel concepts, hooks, formats, story ideas), `POST /profile/bio`.
- Response always includes `source: "live" | "demo"`; the UI can show a small "sample" tag when `demo`.
- Cache by hash of `(route, input)` for 10 minutes so repeated demo clicks are instant and cheap.
- Rate limit per IP (simple token bucket) to protect the key.
- Never put `GEMINI_API_KEY` in a `NEXT_PUBLIC_*` variable.

Frontend adapts: existing `captionService` already falls back correctly; extend `CaptionOption` with `hashtags`. Add `HookService`, `ScriptService`, `BioService` to `lib/services/types.ts` with the same demo/live pattern (so Script tab, Profile Studio and Meme tab stay on fixtures until live is switched on).

Exit: with no key, every endpoint returns fixtures with `source: "demo"`; with a key, returns Gemini output; with the network cut, returns the fixture inside 4 s and never a 5xx.

### B5: Pre-publish engine, audio catalog, publish

Tasks
- Split `fixtures/rules.json` into `rules/{ig,yt,linkedin,x}.json` (each rule: `id, severity, check, params, policyUrl`) plus `audioCatalog.json`. Refactor `precheck()` into a rule runner that loads those files; keep the output shape (`summary`, `items`, `score`) so Review does not change.
- Add the PDF rules not in the code yet: resolution (<720 px wide), file size/codec, safe-zone text overlap (from timeline caption boxes), thumbnail size/ratio/face, missing alt text/description, AI disclosure that reads a project flag (`containsAi`), third-party visuals flag.
- `POST /projects/:id/prepublish`: returns `{ summary, items, score, disclaimer }`.
- `POST /projects/:id/audio/swap`: body `{ trackId }`, must be one of the cleared tracks; updates `audioId`, bumps `version`, re-runs prepublish, returns both.
- Copyright wording stays as written in `precheck.ts` (claim is not a strike, royalty-free is not claim-free, Content ID is YouTube-only). Add a test that fails if any output string contains "copyright safe" or "safe to use".
- `POST /projects/:id/approve` (the Perfect ✓ button): validates caption present, thumbnail present, duration within platform limit; returns `{ clipId, reviewUrl }` or `400` listing what is missing (same list as the tooltip).
- `POST /projects/:id/publish`: requires `Idempotency-Key`; refuses when any Blocker (`fail`) remains (409); runs a publish job (reuse step labels from Review); on success creates a `PublishedPost` (`projectId, platform, publishedAt (from now(req)), metrics: null, metricsAvailable: false`), sets project status `Published`, stores the key. Same key returns the same result.

Frontend adapts: Review replaces `precheck(project)` with `usePrepublish(projectId)` and its `ref` guard with a client-generated key sent as the header. The Fix-it buttons call `audio/swap` instead of `patchProject`. Dashboard and Library read `GET /published-posts`; keep the query keys agreed in the split doc (`['projects']`, `['published-posts']`, `['dashboard']`) and invalidate them after publish.

Exit: g1 (`bgm3`, high risk) fails prepublish on YouTube, swap to `alt1` returns green and a higher score, publish twice with one key creates one post, publish with a blocker returns 409.

### B6: Thumbnails and clip/render endpoints

Tasks
- `GET /projects/:id/thumbnails`: candidate frames (pre-extracted URLs from fixtures; later ffmpeg).
- `POST /thumbnails/score`: heuristic only (contrast, face area, word count, 120 px legibility, badge zone). Response `{ score, estimated: true, checks[] }`. The UI labels it "Click-readiness (Est.)", never "predicted reach".
- `POST /projects/:id/clips/generate`, `POST /projects/:id/align`: fixture-backed jobs returning scored clips and `alignment.json`.
- `POST /clips/:id/render`: returns a job whose result is the pre-rendered file URL (`/demo/<group>/output*.mp4`), keyed by group plus aspect; if the EDL was edited, label `edited: true` in the result so the Demo Panel can show "pre-baked output".
- Pre-render the 5 outputs (and 9:16 variants) with the Remotion CLI using the same Composition as the Studio. Put them in `public/demo/`.

Frontend adapts: `ThumbCard` score and the Clips/Align tabs read from `ClipService`/`ThumbService` (demo: current computed values; live: these endpoints).

Exit: score endpoint is deterministic for the same input; render returns the right file for each group and aspect.

### B7: Home, Dashboard, Calendar, Collabs, Permissions, Audience

Tasks
- Fixture-backed GETs: `/home/feed`, `/trends/audio`, `/trends/memes`, `/hashtags/trending`, `/analytics/overview`, `/analytics/content`, `/analytics/earnings`, `/analytics/insights`, `/audience/summary`, `/collabs/suggestions`, `/collabs/log`, `/library/reuse-suggestions`.
- Dashboard content rows merge fixture rows with real `PublishedPost` rows from B5 (new post appears with its thumbnail, `metricsAvailable: false` shown as "Not available").
- Permissions: `GET/PUT /me/permissions`. When earnings or reach are not granted, the Earnings/Reach endpoints return `403 { code: "PERMISSION_REQUIRED" }` and no data (matches "no network calls to those fixtures" from the PDF).
- Calendar: `GET/POST/PATCH/DELETE /calendar/items`, `GET /calendar/due?now=` (uses `x-demo-now` so the Demo Panel fast-forward fires alarms), `POST /calendar/items/:id/snooze`. One record type, `type: "collab"` entries also appear in the collab log.
- `POST /collabs/swipe`: keep the client-side preference vector re-rank in the browser (PDF section 7.3, 20 lines); the server only records the swipe and returns `matched?`.
- Followers gained (IG) is an estimate: field `followersGained` plus `estimated: true`.

Frontend adapts: these screens already render from fixtures and the Zustand calendar. Move each to a service with demo and live implementations; do it screen by screen, gated by `SERVICE_<NAME>`, so nothing breaks while the backend lags.

Exit: new published post visible in Dashboard table after a refetch; revoking earnings permission makes the endpoint 403; fast-forward fires a due reminder.

### B8: Optional live integrations and media worker (only if time)

- Auth: `POST /auth/demo-login`, `POST /auth/logout`, `GET /me` (session cookie, httpOnly). Logout clears server session; client already clears caches per the PDF.
- Instagram insights and YouTube Analytics for one test account behind `SERVICE_ANALYTICS=live`; missing data returns `available: false`, not 0. Respect the quota notes in PDF section 10.
- FastAPI media worker (ffmpeg, faster-whisper, MediaPipe, PySceneDetect) behind `MEDIA_WORKER_URL` for one live demo; `generate`/`render` call it when set and fall back to the simulator on error or 4 s timeout.
- Real SSE reconnect and job persistence hardening.

### B9: Hardening, integration with the frontend, demo safety

Tasks
- Contract tests: one Vitest/Jest file per domain that loads the matching fixture and parses it with the same Zod schema the route uses (a bad fixture fails CI).
- Route tests for the demo path (steps 2 to 6 of the PDF demo script) end to end with `fetch` against a running dev server.
- Playwright smoke test for the whole demo path with `DEMO_MODE=true`, and once with live services pointed at the backend.
- Offline check: everything works with the network off (fixtures, fonts, media bundled).
- `npm run seed` resets to the exact demo start; wire it to `POST /demo/reset`.
- `grep -r BACKEND-SLOT` must show every item either resolved or intentionally demo.
- Security pass: validate every body, cap upload and body sizes, no secret in client bundle, CORS closed (same origin), rate limits on LLM routes, strip `x-demo-*` headers when `NODE_ENV=production` unless `ALLOW_DEMO_HEADERS=true`.
- Backup screen recording of the full flow.

Exit: demo path runs from a cold reset in under 2 minutes with wifi off; Playwright passes.

---

## 3. Endpoint checklist (PDF section 6 mapped to phases)

| Endpoint | Phase | Backed by today |
|---|---|---|
| `POST /groups/match` | B2 | `lib/match.ts` |
| `POST /groups/:id/generate` | B2 | `makeProject`, `generationSteps` |
| `GET /jobs/:id`, `/jobs/:id/stream`, `POST /jobs/:id/cancel` | B1 | `runJob` logic |
| `GET /studio/items` | B3 | Zustand `projects` |
| `GET/POST/PATCH/DELETE /projects`, `PATCH /projects/:id/edl` | B3 | Zustand actions |
| `POST /projects/:id/captions/suggest`, `/captions/generate` | B4 | existing route |
| `POST /ai/hooks`, `/ai/script`, `/trends/ideas`, `/profile/bio` | B4 | fixtures (`scripts.json`, `creators.json`) |
| `POST /projects/:id/prepublish`, `/audio/swap`, `/approve`, `/publish` | B5 | `lib/precheck.ts`, Review page |
| `GET /projects/:id/thumbnails`, `POST /thumbnails/score` | B6 | `ThumbCard`, `Tools.tsx` |
| `POST /projects/:id/align`, `/clips/generate`, `POST /clips/:id/render` | B6 | `Editor.tsx` clips, fixtures |
| `/home/*`, `/trends/*`, `/hashtags/trending`, `/analytics/*`, `/audience/summary`, `/collabs/*`, `/library/*` | B7 | `home.json`, `analytics.json`, `audience.json`, `creators.json` |
| `GET/PUT /me/permissions`, `/calendar/*` | B7 | `store.ts` |
| `/auth/*`, `GET /me` | B8 | none |
| `/demo/scenarios`, `/demo/groups`, `/demo/reset` | B0 | `DemoPanel.tsx`, `scripts/seed.mjs` |

Note: PDF 6.1 lists `/precheck` and `/publish` with `clipId` in the body; the existing UI routes by project (`/review/[clipId]` resolves `clip_<projectId>`). Implement the project-scoped routes above and add thin `/precheck` and `/publish` aliases that resolve `clipId` to a project, so either caller works.

---

## 4. BACKEND-SLOT ids (add in B0, resolve in the phase shown)

`groups-match` (B2), `groups-generate` (B2), `job-stream` (B1), `studio-items` (B3), `project-get` (B3), `project-patch` (B3), `captions-suggest` (B4), `hooks` (B4), `bio` (B4), `prepublish` (B5), `audio-swap` (B5), `approve` (B5), `publish` (B5), `thumb-candidates` (B6), `thumb-score` (B6), `align` (B6), `clip-render` (B6), `home-feed` (B7), `analytics` (B7), `calendar` (B7), `permissions` (B7), `upload` (B2/B8, presigned or tus upload; demo files never leave the browser), `auth` (B8).

---

## 5. Rules so new frontend changes keep working with this backend

1. **No new direct fixture imports in components** for anything that has a slot above. Go through a service in `lib/services`.
2. **Do not change `lib/types.ts` shapes silently.** Any change to `Project`, `Segment`, `Group`, `MatchResult`, `PrecheckItem`, `CalendarItem` is a contract change: update the matching Zod schema and fixture in the same PR and announce it.
3. **Writes always carry `version`** (projects) and **an Idempotency-Key** (publish, generate). The UI must handle 409 by refetching.
4. **Server time only:** frontend uses the store's demo clock; backend uses `now(req)`. Neither calls `Date.now()` for business logic (publish timestamps, reminders).
5. **Show "Not available" for `available: false` or `null`, "Est." for `estimated: true`.** Do not coerce to 0.
6. **Keep the demo path green:** after any frontend change, run the demo path (PDF section 11.2) in demo mode first, then in live mode.
7. **Zustand holds UI state and a cache;** server data should be refetched via query keys (`['projects']`, `['projects',id]`, `['studio','items',filters]`, `['published-posts']`, `['dashboard',section]`, `['calendar',range]`, `['prepublish',projectId]`, `['captions',projectId]`, `['thumbnails',projectId]`, `['jobs',id]`).

---

## 6. Suggested order and effort

| Phase | Depends on | Rough effort | Why this order |
|---|---|---|---|
| B0 | none | 0.5 day | Everything else imports from it |
| B1 | B0 | 0.5 day | Generate and publish need jobs |
| B2 | B0, B1 | 1 day | Demo step 2, highest judging value |
| B3 | B0, B2 | 1 day | Studio list and editor persistence |
| B5 | B3 | 1 day | Demo step 5 (copyright, fix, publish, hearts) |
| B4 | B0 | 0.5 day | Mostly refactor of the existing route |
| B6 | B3 | 0.5 to 1 day | Thumbnails, clips, render |
| B7 | B3, B5 | 1 to 1.5 days | Dashboard shows the published post |
| B9 | all | 1 day | Test, offline, Playwright |
| B8 | B9 | optional | Only with spare time |

Milestones: **M-B1** = B0 to B3 (demo steps 2 to 4 run against the server); **M-B2** = B4 to B6 (steps 4 to 6 including publish); **M-B3** = B7 (steps 1, 6, 7); **M-B4** = B9 (rehearsal and backup recording).

## 7. Risks

- **Hashes are empty in `groups.json`.** Without the real sample files hashed, renamed files will not match. Generate hashes in B2 and re-run `hash-demo` whenever a file is re-encoded.
- **Storage on Vercel is read-only and per-instance.** Plan the demo on a laptop or use in-memory plus seed on cold start; do not rely on `.data/` in production.
- **Two sources of truth during migration** (Zustand vs repo) can diverge. Cut over per entity (projects in B3, calendar in B7), never half and half.
- **Gemini model name and quota change.** Keep the model in `GEMINI_MODEL`, always have the fixture fallback, and cache.
- **Remotion licensing** for larger for-profit teams (PDF section 3 warning); check before any real deployment.
- **Platform spec numbers** marked as unverified in the PDF (Reel length caps, safe zones, X length) live in `platformProfiles.json` and the rule JSONs; keep the "verify in app" notes in the output.
