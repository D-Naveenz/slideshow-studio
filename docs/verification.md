# Verification results and limits

## Evidence dates and coverage

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
