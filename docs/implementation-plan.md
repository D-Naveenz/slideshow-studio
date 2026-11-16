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
| 4. ▶️ Playback and bounded loading | Natural order, shuffle/history, navigation, timing/pause, three-slide preparation, serialized decoding, resource budget, stale-work disposal, failures/empty sources, and a usable basic viewport renderer. Test timing, history, cache bounds, and load races. | Committed: `153a3cc` |
| 5. 🎨 WebGL and background effects | Fade/slide/instant, Fit/Fill, solid/blurred backgrounds, shared textures, reduced-resolution blur, FPS pacing, fallback, and context lifecycle. Test geometry, resize, readiness, fallback, and resource disposal. | Committed: `b707df2` |
| 6. 🎛️ Navigation and settings overlay | Accessible React overlay/toolbar, auto-hide behavior, shortcuts, saved override precedence/reset, disabled controls, and storage failure handling. Test interactions, focus, precedence, and persistence. | Prepared; user commit pending |
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

### Batch 5

- Confirmed batch 4 was committed as `153a3cc`; the starting working tree was clean. Reused and synced the existing CodeGraph index.
- Added PixiJS 8.23.0 as the only new direct dependency, retaining existing dependency versions. The user's separate Pixi starter was inspected read-only; its version and relative-asset setup match this implementation. No unrelated starter integrations were imported.
- Added shared prepared-image textures, cached slide compositions, reduced-resolution background blur, Fit/Fill geometry, and fade/slide/instant transitions. Kept image loading, resource bounds, playback, and scheduling outside React. Prefetch warms GPU source textures; cache eviction releases textures before clearing prepared canvases.
- Increased the estimated rendering reserve from 48 to 112 MiB within the existing 256 MiB budget to account for the display, two composition textures, blur targets, and overhead. Prepared resolution falls as needed to fit the remaining budget. This remains an owned-resource estimate, not a browser-process memory guarantee.
- Added independent transition/hold clocks, pause/resume of active transitions, host FPS pacing with fractional interval carry, and idle rendering without animation-frame requests. Disabled PixiJS maintenance and interaction tickers; the controller and React own these responsibilities.
- Added Canvas2D fallback for unsupported WebGL or rendering failure, temporary fallback on context loss, restoration with composition rebuilding, explicit resource cleanup, and a `?renderer=canvas` diagnostic option. Extended the existing development panel with transition/background controls and renderer status; the production toolbar and saved settings remain batch 6.
- Final checks passed: `pnpm build`, `pnpm lint`, 46 unit tests, 4 package tests, and 17 offline Microsoft Edge browser tests. Package/browser suites used their underlying runners against the final build. Tests include transition readiness, separate holds, pause/FPS behavior, geometry, sharp/blurred/color pixels, idle scheduling, GPU texture eviction over repeated navigation, unavailable WebGL, context loss/restoration, and existing imports/playback/resize coverage.
- Ran a limited native Wallpaper Engine smoke test using the official CLI's separate named preview window, without replacing the desktop wallpaper. A diagnostic copy of the built package confirmed the actual PixiJS WebGL backend, automatic image cycling/fades, and a sharp portrait over a blurred covered background. Settings and fixture paths were injected through host callbacks for this test. Closed the named preview afterwards; diagnostic artifacts remain ignored under `test-results/`.
- The native smoke test does not verify the real properties panel, native directory notifications, host FPS/pause/input forwarding, multi-monitor operation, or photographic 4K/8K performance. Those checks and measured limitations remain batch 7. Browser SVG fixtures verify sizing and rendering, not photographic decoding performance.
- Updated architecture, package metadata, and README to describe implemented behavior. Generated assets/index/test artifacts remain ignored; bundled sample images are unchanged.

### Batch 6

- Confirmed batch 5 was committed as `b707df2`; the starting working tree was clean. Reused CodeGraph for exploration. No CodeGraph MCP tool is exposed; used the existing CLI outside `PATH`.
- Added Radix Dialog 1.3.1 for accessible modal behavior/focus management and Lucide React 1.73.0 for toolbar icons. Retained existing dependency versions. Both are bundled locally with their dependency licenses; package checks confirm classic offline scripts and no runtime module/Node imports.
- Added a dark React toolbar with previous/play-pause/next/settings, meaningful disabled states, three-second auto-hide, hover/focus protection, and keyboard focus revealing hidden controls. Added Left/Right, Space, S, and Escape behavior where input is forwarded; form/button editing/activation, modifiers, repeats, and composition events are respected. The host master switch disables the overlay and its shortcuts.
- Added a scrollable settings dialog with a sticky header/close button, native labeled fields, focus trapping/return, playback/appearance controls, local-override status, and reset. Source selection stays in Wallpaper Engine's panel. The existing development preview remains separate.
- Added `SettingsPreferences` with shared validation, an explicit persistence allowlist, a versioned storage record, and defaults → initial host values → saved override precedence. Buffered initial events and a first late initial event preserve overrides. Later changed host values clear matching overrides; repeats/unrelated updates preserve them. Reset restores latest host values. Corrupt/unknown-version records and blocked/full storage leave session controls usable.
- Checks passed: build, lint, 52 unit tests, 4 package tests, and all 24 offline Edge browser tests (80 tests total). A targeted repeat of the 7 overlay browser tests also passed after ensuring hidden controls can be reached with Tab. Browser coverage includes actual reload persistence, partial host changes, reset, storage access/write failures, toolbar actions/shortcuts, field editing, modal focus, auto-hide, controls disabled during an open dialog, and empty/single-image states.
- Inspected desktop and portrait dialog screenshots. Added explicit select/range labels and retained a visible close/header while scrolling. Reviewed React hooks/dependencies, StrictMode cleanup paths, native control accessibility, cached external-store snapshots, tree-shaken icons, and the separation from frame rendering using the React best-practices checklist.
- Full native Wallpaper Engine input forwarding, native storage persistence, directory/property integration, multi-monitor operation, and large-photo memory/performance measurements remain batch 7. No new native host verification is claimed for this batch.
