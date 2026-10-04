# Frontend → creatorai integration plan

Goal: make `creatorai/` use the UI from `frontend/` while keeping every backend piece
(`app/api/**`, `lib/server/**`, `lib/schemas/**`, `lib/api/**`, `tests/**`, `middleware.ts`).

## What the comparison found

- `frontend/` has screens `creatorai/` lacks: `short-videos/[format]`, `videos/[format]`,
  `components/short/*`, `components/home/Discovery.tsx`,
  `components/home/FeatureCards.tsx`, `components/shell/CalendarOverlay.tsx`,
  `components/ui/RubberSegment.tsx`, `components/ui/Stepper.tsx`.
- `creatorai/` has the whole backend plus a few UI files only it uses:
  `ProjectSync`, `SettingsSync`, `AiClipLab`, `lib/api/*`, `lib/clips.ts`, `lib/jobSteps.ts`.
- Files that exist in both but differ (the risky part):
  - UI-only differences: `globals.css`, `HomeSections`, `AppShell`, `Editor`, `Tools`,
    `UploadWorkspace`, `tailwind.config.ts`.
  - Backend-coupled differences: `lib/services/{types,index,live,demo}.ts`, `lib/store.ts`,
    `lib/types.ts`, `lib/projects.ts`, `lib/match.ts`, `lib/precheck.ts`,
    `app/(app)/layout.tsx`, `app/api/v1/captions/generate/route.ts`.
  - Config: `package.json` (creatorai adds vitest), `next.config.mjs` (distDir), `tsconfig.json`.

## Rule for every conflicting file

Never overwrite blindly. Take the frontend version as the base for presentation and re-apply
the creatorai backend hooks on top. The backend-coupled files keep the creatorai version and
gain only the new types/fields the frontend needs (`style`, `CreatorFeedback`, `friendlyTitle`,
`segmentName`, ...).

## Phase 0 — Safety
1. Work on a new branch `frontend-swap` from `integration` (easy rollback).
2. Do NOT run `npm install` until Phase 5 is reached.

## Phase 1 — Add frontend-only files (no conflicts)
Copy files that exist only in `frontend/`: new pages, `components/short`, `profile`,
`Discovery`, `FeatureCards`, `CalendarOverlay`, `RubberSegment`, `Stepper`.

## Phase 2 — Overwrite pure-UI files
Copy the frontend version of: `globals.css`, `tailwind.config.ts`, `app/layout.tsx`, the
`(app)`/`(public)` pages and template, `components/{home,landing,shell,studio,ui,workspace}`
files that are UI only. Before each overwrite, diff for backend calls (`lib/api`,
`useProject`, fetches to `/api/...`) and keep those calls.

## Phase 3 — Merge backend-coupled files
For each: start from the creatorai version, add what the frontend needs.
- `lib/types.ts`, `lib/projects.ts`: add `CreatorFeedback`/`FeedbackType`, `friendlyTitle`, `segmentName`.
- `lib/services/*`: keep creatorai's live/demo fallbacks; add `style` to `CaptionInput`.
- `lib/store.ts`: keep backend-related state, add frontend-only fields.
- `app/(app)/layout.tsx`: keep `<ProjectSync />` and `<SettingsSync />` around the frontend shell.
- `AppShell`, `Editor`, `Tools`, `UploadWorkspace`: frontend layout, but keep calls to
  the project/job APIs and `AiClipLab` where the creatorai version used them.

## Phase 4 — Connect new screens to the backend
- Short/video create flow → `POST /api/upload`, `/api/v1/projects`, `/clips/generate`, job stream.
- Captions → `/api/v1/captions/generate` (now accepts `style`; extend `captionsBody` schema).
- Calendar overlay → `/api/v1/calendar/*`.
- Every service keeps the "live, else demo fallback" behaviour so the UI never errors.

## Phase 5 — Verify
1. `npm install` in `creatorai/` (approval required), then `npm run typecheck`.
2. `npm test` (vitest) — backend contract tests must still pass.
3. `npm run dev`, click through: welcome → home → short-videos → create flow → studio →
   review → dashboard → profile studio.
4. Fix mismatches (props, route shapes, schema fields).

## Phase 6 — Cleanup
Decide whether to delete `frontend/` (it becomes a duplicate), update docs, commit on the branch.

## Status (executed)
Phases 0–3 and 5 done on branch `frontend-swap`: typecheck clean, 76/76 tests pass, `next build` succeeds
(all new routes generated). Backend re-attached in: layout (ProjectSync/SettingsSync), UploadWorkspace
(groupService, projectApi, AiClipLab), Editor (scriptService, hookService), HomeSections (ideaService),
profile-studio (bioService), Tools (shared clickReadiness), captions (`style` accepted by schema + prompt).
Not done: Phase 4 browser click-through with a live Gemini key; Phase 6 (delete `frontend/`, commit).
Known gap: the new CreateFlow/Discovery screens use fixtures/demo data, not live APIs, until wired.
