# Staged implementation plan

## Commit workflow

Implement one batch at a time, in order. Never run `git commit` or `git push`. Once the current batch is written and verified, summarize it and stop with:

> Ready for your custom git commit. Reply 'continue' once you have committed.

Do no further work until the user replies. On continuation, check history/status to confirm that the previous batch was committed. The user generates Gitmoji-style commit messages. Include documentation and tests with the feature they describe; do not defer all checks to the final batch.

The Vite migration and dependency upgrade are already committed (`a6bb245` and `71c7317`). Preserve that setup, the license, sample wallpapers, and Git history.

## Batches

| Batch | Deliverable and acceptance | Status |
| --- | --- | --- |
| 1. 📝 Agent instructions and documentation | Add `AGENTS.md`, architecture/plan docs, and project README. Initialize an existing CodeGraph installation and verify an exploration query. Check documentation and repository changes. | Committed: `23facbd` |
| 2. 📦 Static wallpaper packaging | Relative local assets, classic JavaScript bundle, minimal project metadata, early buffered callbacks, retained HMR/samples, removed starter branding, focused test infrastructure, and package checks. Verify build, lint, and offline local-file startup. | Committed: `bfac76e` |
| 3. 🔌 Settings and image sources | Typed validated settings and matching properties; partial host/FPS/pause/directory events; sample/image/folder sources; safe local URLs; browser preview imports and mock events. Test buffering, merges, catalogue updates, and path handling. | Committed: `bd54cc4` |
| 4. ▶️ Playback and bounded loading | Natural order, shuffle/history, navigation, timing/pause, three-slide preparation, serialized decoding, resource budget, stale-work disposal, failures/empty sources, and a usable basic viewport renderer. Test timing, history, cache bounds, and load races. | Prepared; user commit pending |
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

### Batch 2

- Confirmed batch 1 was committed as `23facbd`; the starting working tree was clean.
- Configured Vite to output a classic IIFE bundle and relative assets, with generated production HTML, minimal web project metadata, local favicon, and license files. Kept all four sample images intact and replaced starter branding with a static sample screen.
- Added a synchronous, typed callback bridge that queues events before a consumer connects, preserves partial updates and reentrant ordering, and supports cleanup/reconnection.
- Added Node unit/package tests and Playwright offline browser tests. Playwright is the only new direct dependency, used only for development/testing; existing dependency versions were retained.
- Verified the built package from a relocated directory containing spaces, Unicode, and `#`, without a server and with browser networking offline. Landscape (1280×720), portrait (390×844), and ultrawide (2560×1080) checks passed with no remote/failed requests or console errors. Checked the landscape screenshot visually.
- Verified Vite development rendering, local sample loading, and bridge availability; a temporary CSS probe applied through HMR without page reload and was restored afterwards. The development server was stopped after testing.
- The managed sandbox prevented package-store writes and browser/localhost access; dependency installation and browser checks succeeded using approved escalated execution. No additional browser download was needed; tests used installed Microsoft Edge.
- Final checks passed: `pnpm build`, `pnpm lint`, 7 Node bridge tests, 4 built-package tests, and 3 offline Edge browser tests. Package/browser suites ran against the final build using their underlying runners to avoid redundant builds.
- Documentation links, documented commands, whitespace, temporary HMR-probe cleanup, and `git diff --check` passed. Final diff review confirmed sample wallpaper files are unchanged and generated build/test/index artifacts remain ignored.
- Actual Wallpaper Engine import/runtime behavior, host settings application, slideshow playback, and performance/stress checks remain unverified and belong to later batches.

### Batch 3

- Confirmed batch 2 was committed as `bfac76e`; the starting working tree was clean. Synced the existing CodeGraph index before exploration.
- Added typed settings/validation and generated matching properties in the built `project.json`, using root project metadata. Added partial-property, FPS, pause, and directory-event handling through the early bridge.
- Added sample/single-image/directory catalogues with safe local URLs, case-aware identities, modification revisions, folder replacement/removal handling, and browser object URL cleanup. Enumeration retains references without eager image requests or decoding.
- Added a development preview for browser file/folder inputs, source selection, FPS/pause mock events, and received-settings inspection. It is automatically available in Vite dev or explicitly through `?preview=1` in the built package; normal production hides it.
- Extended Node tests to native TypeScript with a separate strict type-checking project. Added no dependencies or dependency upgrades.
- Offline browser checks exercised 150 host references without imported image requests, special-character filenames, folder filtering/reselection, session-only imports, replaced-URL cleanup, early events, and portrait/landscape/ultrawide layout. Desktop and portrait preview screenshots were inspected visually.
- Final checks passed: `pnpm build` (including strict TypeScript test checks), `pnpm lint`, 27 Node unit tests, 4 package tests, and 6 offline Edge browser tests. Package/browser suites ran against the final build using their underlying runners to avoid redundant builds.
- Development-mode verification passed: the preview panel appears automatically, host updates reach live state, and CSS HMR preserves adapter state. The temporary probe was restored and the development server stopped.
- Reviewed React subscriptions, hook usage, labels, keyboard-accessible native controls, and preview layout. Documentation/link checks and final diff checks passed; generated artifacts remain ignored and sample images/dependencies are unchanged.
- Actual Wallpaper Engine behavior, image preparation/playback, rendering effects/FPS pacing, and persistent end-user settings remain for later batches.

### Batch 4

- Confirmed batch 3 was committed as `bd54cc4`; the starting working tree was clean. Reused/synced the CodeGraph index for exploration.
- Added natural ordering, shuffle bags, actual navigation history, configurable holds, overlapping pause reasons, and a single asynchronous playback/preparation worker outside React.
- Added cancellation/generation guards, revision-based failure skipping, a three-slide cache with in-flight reservations, screen-sized preparation, conservative 256 MiB accounting, and cleanup of evicted/late resources.
- Replaced the static starter screen with a viewport-covering canvas. Added development-only previous/play-pause/next controls, hold/shuffle mocks, and resource diagnostics. Production has no branding overlay while displaying an image.
- Added deterministic clock/loader unit tests for serialized work, slow-next readiness, history/shuffle, memory bounds, stale results, pause overlap, failures, resize, and disposal. Covered pausing while an automatic move awaits decoding, so it cannot advance until resume. Extended offline browser checks to real playback, corrupt-image recovery, a 150-file folder with bounded requests, downsampling an 8K-dimension SVG, and same-path file updates using fresh revision URLs.
- Browser checks passed in landscape/portrait/ultrawide; the landscape wallpaper and portrait preview screenshots were inspected visually. The SVG test verifies geometry/preparation limits, not 8K photographic decoding performance.
- Checks passed: build, lint, 40 unit tests, 4 package tests, and 10 offline Edge browser tests. Targeted preparation/resize checks were repeated after adding backing-store allocation guards. Development playback, navigation, pause, and CSS HMR preserving the current slide/state also passed; the temporary probe was restored and the server stopped.
- React remains subscribed to meaningful state changes rather than animation frames. Reviewed hook usage, store snapshots, native controls/labels, and cleanup boundaries. No dependencies were added or upgraded; generated artifacts stay ignored and sample images are unchanged.
- WebGL, transitions, Fit/blur, animation FPS pacing, the desktop toolbar/settings overlay, real Wallpaper Engine verification, and full photographic stress/performance measurements remain in their planned later batches.
