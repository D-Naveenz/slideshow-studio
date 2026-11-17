# Verification results and limits

## Evidence dates and coverage

**2026-11-18 compact controls refinement:** build/typecheck, lint, 54 unit tests, 5 package tests and 32 offline Edge browser tests passed against the final runtime build, reusing that build for direct package/browser runners. New coverage verifies the pagination-card's original 8px padding and compact width, no filename/caption, current/total updates through navigation/shuffle, natural-order numbering for unsorted imports, empty/single-image collections, fractional number stepping, bounds, disabled state, clearing/blur restoration and reset. Developer-panel coverage exercises host-number patches, zero/uncapped FPS, keyboard stepping, portrait containment and availability when the production overlay is disabled. Existing placement, focus, persistence, offline and renderer checks still pass. Numeric locators now follow the library's textbox semantics; source-list assertions are scoped separately from the pagination list. The final suite still requires Edge execution outside the filesystem sandbox.

Visual review covered the compact dark green acrylic toolbar, settings number fields, developer controls, dark/light tokens and existing forced-colors/portrait layouts. Developer theme screenshots finish finite CSS transitions before capture. The toolbar reuses the free [pagination-card example](https://reui.io/preview/radix/c-pagination-6) with its original spacing; numeric controls reuse the [small number-field example](https://reui.io/preview/radix/c-number-field-2). ReUI MCP remains unavailable, so registry/CLI, installed APIs and local quality/anti-pattern checks were used. C1 has four reviewed false positives for the literal `transition` settings key in the selector helper type/call in `src/ui/SettingsPanel.tsx` and `src/PreviewTools.tsx`; C2–C4 have no hits. The React review found no new per-frame UI work; the position lookup uses memoized metadata only.

Emitted assets are JavaScript 812.46 kB (247.41 kB gzip) and CSS 49.16 kB (9.08 kB gzip). These are build sizes, not playback performance or memory measurements. The number field brings Base UI as a bundled runtime dependency; unused Frame source and its lint exception were removed. Rendering/preparation/resource code is unchanged and stress was not rerun. A fresh native window inventory found no targetable Wallpaper Engine window; no installed files were changed. Actual desktop taskbar/icon, DPI and multi-monitor verification remains pending.

**2026-11-17 ReUI migration batch:** build/typecheck, lint, 54 unit tests, 5 package tests and 29 offline Edge browser tests passed against the final runtime build. The shared final build was reused by the direct package/browser runners. Coverage retains placement, preference precedence/reset, keyboard shortcuts, focus trapping/return, auto-hide, offline local-file startup and preview tools. New checks cover Switch keyboard/state geometry, a named Slider thumb and keyboard values, dark/light tokens, reduced-motion operation, forced-colors access and short-dialog scrolling with a visible close control. The clock-driven dismissal test waits for the real CSS exit before advancing Radix's deferred JavaScript focus timer. Dark/light/forced-colors settings and toolbar screenshots were reviewed. Browser tests required execution outside the filesystem sandbox because of the previously recorded Edge launch failure.

ReUI MCP discovery, API validation and remote audit tools were unavailable. The documented shadcn CLI/official-docs fallback was used; installed APIs and the free basic Frame example were read, adapted, and the unused example removed. The local quality/anti-pattern and React reviews passed, with two C1 scanner false positives: the literal `transition` settings key in the selector helper type and invocation in `src/ui/SettingsPanel.tsx` is not a motion class. C2–C4 scans have no hits. Motion uses CSS only, so no `motion/react`/MotionConfig dependency was added; the app-owned fade handles reduced motion, while installed components retain their motion. The generated Slider's accessible-name forwarding is the only functional change to registry source.

Final emitted assets: JavaScript 776.60 kB (234.34 kB gzip), CSS 55.15 kB (9.99 kB gzip), compared with placement-batch assets of 704.86 kB (210.45 kB gzip) and 9.00 kB (2.52 kB gzip). These are Vite build sizes, not runtime memory or responsiveness measurements. Rendering/preparation/resource code was unchanged; stress was not rerun.

**Native limit:** the installed CEF library reports Chromium 146.0.7680.179, above the new Chrome 111+ CSS baseline. Attempting to launch Wallpaper Engine through computer use returned `launched app did not expose a targetable window`. This does not verify that the running host loaded the package. Installed wallpaper files were left untouched; embedded-host controls, actual taskbar/icon clearance, auto-hide taskbar reveal, DPI and multi-monitor acceptance remain pending.

**2026-11-17 toolbar placement batch:** build/typecheck, lint, 54 unit tests, 5 package tests, and 26 offline Edge browser tests passed against the final build. Edge launch inside the filesystem sandbox failed with a Crashpad named-pipe error; the suite passed outside that sandbox. New coverage exercises four anchors, 80-pixel clearance, viewport clamping at 390×300 with a saved 256-pixel margin, dialog access/focus return, legacy v1 preference loading, placement persistence/host precedence/reset, and blocked storage. Toolbar screenshots at 1280×720 were reviewed for horizontal and vertical layout. These are browser/package results, not native shell acceptance. The installed wallpaper was not updated; actual visible/auto-hide taskbar, desktop-icon, DPI and multi-monitor checks remain pending. Rendering/preparation/resource behavior was unchanged, so stress was not rerun.

Historical **2026-11-16** v1.0 release checks passed build, lint, 52 unit tests, 5 package tests, and 24 offline Edge browser tests. Raster stress and native user evidence below are also from 2026-11-16; they are not fresh measurements of later documentation work. Stress predates the visible version label; rendering/loading code was unchanged by that label.

**2026-11-17 documentation validation:** build, lint, 52 unit, 5 package, and 24 offline Edge browser tests passed against one final build. Edge required execution outside the filesystem sandbox after a browser-launch named-pipe failure inside it. Stress and native integration were not rerun; their evidence remains dated above.

| Check | Coverage |
| --- | --- |
| Build / lint / unit | TypeScript projects, production bundle, Oxlint; bridge, validation, paths, catalogue, order, clocks, budgets, races, and preference precedence/persistence. |
| Package | Relative local assets, metadata/version consistency, licenses, intact samples, classic scripts, and no runtime module/Node imports. |
| Offline browser | Relocated `file://` package, aspect ratios, early callbacks, imports/failures, timing/pause/FPS, bounded resources, resize, rendered effects, context recovery, and controls/focus/storage. PixiJS and Canvas2D are exercised. |
| Raster stress | Two 310-move runs: browser imports/PixiJS and direct files/Canvas2D; method and measurements below. |

Browser suites use offline contexts without a web server. Node drives tests/builds, not wallpaper playback. Browser mocks do not certify embedded-host compatibility.

## Run the checks

```sh
pnpm build
pnpm lint
pnpm test
pnpm test:package
pnpm test:browser
```

Package/browser scripts each build first. To share one already-verified final build, replace those last two commands with `node --test tests/package/*.test.mjs` and `pnpm exec playwright test`.

Install test Chromium with `pnpm exec playwright install chromium`, or select installed Edge in PowerShell with `$env:PLAYWRIGHT_CHANNEL = 'msedge'`. Screenshots/traces are ignored under `test-results/`.

For preparation/rendering/resource changes or new performance claims, also run `pnpm test:stress` (or `node tests/stress/slideshow.mjs` after the final build). Default source is browser imports and requires WebGL. Set `$env:STRESS_SOURCE = 'file'` for the direct-file fallback run, then clear it with `Remove-Item Env:STRESS_SOURCE`. Optional `STRESS_MOVES` must be at least 300. Reports are `report-import.json` / `report-file.json` under `test-results/stress/`. Allow several minutes, several hundred MiB of temporary disk space, hard-link support, and substantial transient decoding RAM. Fixtures are not shipped.

## Raster stress method

`pnpm test:stress` runs `tests/stress/slideshow.mjs` against a fresh offline Edge context at 1920×1080. It generates six JPEGs by scaling bundled photographs to alternating 3840×2160 and 7680×4320 sizes, then hard-links them into 150 distinct filename paths. Thus this exercises real raster decoding and two full catalogue cycles, but uses six repeated contents rather than 150 unique camera originals. Filesystem/browser caches are warm on repeat visits; it is not a cold-disk benchmark.

A seventh fixture is a 7680×4320 PNG with deterministic low-bit RGB noise over an upscaled photograph. Its size is 88,879,693 bytes (84.8 MiB), deliberately exceeding the motivating 50 MB example. It is synthetic high-entropy data rather than an untouched camera image. Fixtures remain ignored and are not shipped.

The run makes 310 sequential manual moves using Instant transitions and a 3600-second hold, then selects the PNG and clears the source. DOM diagnostics, retained prepared-canvas backing sizes, live WebGL texture handles, and CDP JavaScript heap metrics are sampled every 25 moves. Real-time latency includes Playwright interaction/protocol overhead and any outstanding prefetch work; it is not pure decode time or transition frame time. Animated blur/transitions are covered by the normal rendering tests, not by this instant-navigation benchmark.

## Test system

| Item | Observed value |
| --- | --- |
| OS | Windows 11 Pro, 10.0.26300 |
| CPU | AMD Ryzen 9 5900HS; browser reported 16 logical processors |
| RAM | About 15.4 GiB usable; browser reports 16 GiB |
| GPU used by Edge | AMD Radeon Graphics via ANGLE / Direct3D 11 |
| Other installed GPU | NVIDIA GeForce RTX 3060 Laptop GPU; not used by this measured Edge context |
| Radeon / NVIDIA driver versions | 31.0.21925.1001 / 32.0.16.2124 |
| Browser | Microsoft Edge 157.0.4341.60, headless |
| Reported maximum GPU texture side | 16384; application caps at 8192 |
| Installed Wallpaper Engine executable | 2.8.0.42 (UI: 2.8.42) |

## Measured results

| Measurement | Browser imports / PixiJS | Direct file paths / Canvas2D |
| --- | --- | --- |
| Manual navigation median | 298 ms | 254 ms |
| Manual navigation p95 | 502 ms | 410 ms |
| Manual navigation maximum | 599 ms | 581 ms |
| Large PNG selection → ready | 1845 ms | 1238 ms |
| Long tasks observed / maximum | 311 / 757 ms | 272 / 528 ms |
| Prepared slides at sampled cycle states | 2 | 2 |
| Prepared pixels at sampled cycle states | 4,147,200 | 4,147,200 |
| Estimated owned resources including reserve | 143.6 MiB | 143.6 MiB |
| Live texture handles at sampled cycle states | 4 throughout | 0 |
| Sampled JavaScript heap range | 5.8–7.2 MiB | 5.2–6.3 MiB |
| Prepared resources after clearing | 0 slides / 0 pixels | 0 slides / 0 pixels |
| Texture handles after clearing | 1 renderer placeholder | 0 |
| Page exceptions / remote requests | 0 / 0 | 0 / 0 |

The prepared allocations and GPU handle counts plateaued across these repeated cycles and released image resources on clearing. The 112 MiB render reserve remains in diagnostics even after clearing because it is a reservation, not an allocation measurement. JavaScript heap stayed within the reported range but does not include decoded-image memory, canvas backing stores, GPU allocations, browser caches, or process working sets. No browser-process memory plateau or peak-RAM claim is made.

Long tasks and PNG readiness show that large-source work can still stall. These runs do not establish smooth frame delivery on all hardware, storage media, drivers, resolutions, or multiple monitors. They do not measure battery/power consumption, hours-long leak behavior, or 4K-output transition FPS.

## Native Wallpaper Engine evidence

**2026-11-16, user-supplied screenshots:** editor full-folder import through Create Wallpaper, editor rendering with toolbar, installed-project/native property presence, and successful desktop application are confirmed. The desktop also shows the taskbar obscuring the toolbar; that fix remains deferred. See the [original evidence and attribution](evidence/README.md) and [desktop lessons](desktop-lessons.md).

Read-only native checks confirmed source/image and Fill/Fit property display conditions, pre-release project identity, then-current JS/CSS/bridge hashes, and an active configuration reference. These checks do not establish all renderer responses or that later builds were loaded. The version-label build was not synchronized into the installed project during that verification.

Screenshots do not identify the backend or prove timing, storage, frame cadence, or process-memory bounds. Loose-file/pop-out opening is distinct from successful editor import; failures in those routes do not establish failure of the imported project.

## Further native acceptance checks

Reuse an appropriate working import, or an isolated test project when needed, following the [operating guide](operating-guide.md). Record actual conditions and results before marking checks complete.

| Area | Remaining acceptance |
| --- | --- |
| Installation | Deliberate rebuild/update synchronization and reload; remaining property display conditions; startup with Node/dev servers stopped and network unavailable. |
| Sources | Real single image and 150+ image folder; order, shuffle/history, finite failure skipping; add/modify/remove/rename, replacement, and disconnection with visible pixel updates. |
| Appearance/settings | Fit/Fill, solid/blurred backgrounds, each transition/timing; changed host values clearing matching overrides. |
| Pause/FPS | Actual host pause during holds/transitions and remaining-time resume; global FPS including low rates, measured transition cadence and static idle behavior. |
| Input/storage | Pointer controls and available keyboard forwarding without changing security settings; master switch disabling shortcuts; native restart persistence, reset, and project/profile isolation. |
| Desktop/layout | Full toolbar visibility/clickability around taskbar/icons; small windows, high DPI, inset scrollbars, focus outlines, and forced-colors mode. |
| Performance | Target-monitor large-photo cycles including 4K, ultrawide, and multiple monitors; longer host/browser process and GPU-memory observation. |
