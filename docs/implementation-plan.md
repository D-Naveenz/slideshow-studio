# Staged implementation plan

## Commit workflow

Implement one batch at a time, in order. Never run `git commit` or `git push`. Once the current batch is written and verified, summarize it and stop with:

> Ready for your custom git commit. Reply 'continue' once you have committed.

Do no further work until the user replies. On continuation, check history/status to confirm that the previous batch was committed. The user generates Gitmoji-style commit messages. Include documentation and tests with the feature they describe; do not defer all checks to the final batch.

The Vite migration and dependency upgrade are already committed (`a6bb245` and `71c7317`). Preserve that setup, the license, sample wallpapers, and Git history.

## Batches

| Batch | Deliverable and acceptance | Status |
| --- | --- | --- |
| 1. 📝 Agent instructions and documentation | Add `AGENTS.md`, architecture/plan docs, and project README. Initialize an existing CodeGraph installation and verify an exploration query. Check documentation and repository changes. | Prepared; user commit pending |
| 2. 📦 Static wallpaper packaging | Relative local assets, classic JavaScript bundle, minimal project metadata, early buffered callbacks, retained HMR/samples, removed starter branding, focused test infrastructure, and package checks. Verify build, lint, and offline local-file startup. | Pending |
| 3. 🔌 Settings and image sources | Typed validated settings and matching properties; partial host/FPS/pause/directory events; sample/image/folder sources; safe local URLs; browser preview imports and mock events. Test buffering, merges, catalogue updates, and path handling. | Pending |
| 4. ▶️ Playback and bounded loading | Natural order, shuffle/history, navigation, timing/pause, three-slide preparation, serialized decoding, resource budget, stale-work disposal, failures/empty sources, and a usable basic viewport renderer. Test timing, history, cache bounds, and load races. | Pending |
| 5. 🎨 WebGL and background effects | Fade/slide/instant, Fit/Fill, solid/blurred backgrounds, shared textures, reduced-resolution blur, FPS pacing, fallback, and context lifecycle. Test geometry, resize, readiness, fallback, and resource disposal. | Pending |
| 6. 🎛️ Navigation and settings overlay | Accessible React overlay/toolbar, auto-hide behavior, shortcuts, saved override precedence/reset, disabled controls, and storage failure handling. Test interactions, focus, precedence, and persistence. | Pending |
| 7. ✅ Integration and operating guide | Full checks, real Wallpaper Engine verification, offline/native properties/directory/pause/FPS/input checks, 150+ path and 4K/8K stress tests, measured limitations, and complete import/troubleshooting docs. | Pending |

Approved behavior and defaults are specified in [architecture.md](architecture.md). Changes to that design should be recorded explicitly rather than silently introduced while implementing a batch.

## Verification record

### Baseline

- Starting revision: `71c7317` (dependency upgrade following the Vite migration).
- Initial working tree was clean. The current scripts are `dev`, `build`, `lint`, and `preview`; no automated test script exists yet.
- Baseline `pnpm build` and `pnpm lint` passed during planning. Rerun the applicable checks for each implementation batch.

### Batch 1

- Added persistent agent instructions, architecture boundaries, the staged commit workflow, and a project-specific README.
- Found an existing CodeGraph CLI, version 1.6.2, at `%APPDATA%\npm\codegraph.cmd`; it is not on the current shell's `PATH`. No CodeGraph MCP tool is exposed in this session.
- Ran `codegraph init --yes` through that installation at the repository root: indexed 4 files, 16 nodes, and 20 edges.
- Verified `codegraph explore "App in src/App.tsx"` returned the current line-numbered `App` source.
- CodeGraph generated `.codegraph/.gitignore`; retain its ignore rules and exclude generated databases/caches from commits.
- `pnpm build` passed (TypeScript project checks and Vite production build); `pnpm lint` passed.
- Local documentation links, documented package scripts, whitespace, and the exact Git Workflow Rule were checked successfully. `git diff --check` passed.
- Repository review confirmed only the README, agent instructions, project docs, and CodeGraph ignore file are included in this batch. The generated database is ignored and untracked; application code and dependencies are unchanged.
- Wallpaper Engine runtime, slideshow behavior, offline packaging, automated feature tests, and stress/performance checks are not implemented or verified in this batch.
