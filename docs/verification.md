# Verification results and limits

## Scope

v1.0 verification combines automated package/browser checks, raster stress measurements recorded on 2026-11-16, and user-confirmed native editor/desktop evidence. Native acceptance remains scoped to observed scenarios and must not be inferred from browser mocks.

## Automated checks

| Check | Result |
| --- | --- |
| TypeScript/Vite production build | Passed |
| Oxlint | Passed |
| Node unit tests | 52 passed |
| Built package tests | 5 passed |
| Offline Edge browser tests | 24 passed |
| 310-move imported-raster stress run | Passed; PixiJS WebGL |
| 310-move direct-file raster stress run | Passed; Canvas2D fallback |

Release verification passed build, lint, and 81 automated tests (52 unit, 5 package, 24 browser). Package checks include consistent application version metadata; browser checks include the settings version label and root version diagnostic. The retained raster stress measurements predate the version-label change; the rendering/loading implementation is unchanged and those expensive stress runs were not repeated for version/documentation changes.

The package tests verify local assets, metadata, licenses, unchanged sample files, classic script parsing, and absence of runtime module/Node imports. Browser tests cover relocated packages, landscape/portrait/ultrawide layouts, host callback simulation, imports/catalogue changes, failures, timing, pause, FPS logic, cache bounds, resize, rendered effects, context loss/restoration, texture eviction, and overlay focus/storage/interaction behavior. Browsers use `file://` with networking offline and no web server. Node runs only the test/build driver.

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

### Current confirmed result: editor import and desktop display

On 2026-11-16, the user supplied a step-by-step editor import demonstration and screenshots. They confirm creating a web project by dropping `dist/index.html` onto the editor's **Create Wallpaper** area, importing the full built folder, naming it **Slideshow Studio**, seeing the bundled mountain image and toolbar in the editor preview, finding the saved project with native properties in the main window, and applying it successfully to the desktop.

These are user-confirmed native results, not automated observations by the agent. Editor import, native preview rendering, installed-project visibility, native property presence, and desktop application are now confirmed. The screenshots do not establish every transition, directory update, pause/FPS behavior, keyboard forwarding, or storage/performance scenario below. Backend selection is not inferred from the images.

The earlier attempts below are historical diagnostic results from different opening flows. They did not exercise the required editor project-creation/import workflow, and their black captures do not establish a rendering failure in the correctly imported project.

### Diagnostic and evidence boundaries

Direct CLI/offline-file/pop-out tests were not the editor project-creation workflow. Some captures were black even for a minimal static HTML probe; the cause was not established. These results cannot establish a failure of the correctly imported wallpaper. Use the editor import process for first installation and reuse the working project for subsequent checks.

Native panel inspection confirmed source/image display conditions and Fill/Fit background conditions. Read-only installed-file checks confirmed the pre-release project identity, matching then-current JS/CSS/bridge hashes, and an active configuration reference. These checks do not prove that every native event affects the renderer. The version-label build has not been synchronized into the user's installed project.

See the [retained screenshot evidence](evidence/README.md) and [desktop lessons](desktop-lessons.md). Screenshots confirm the visible results and taskbar overlap; they do not identify the backend or prove timing, native storage, frame cadence, or process-memory bounds.

## Further native acceptance checks

Known deferred usability issue: the user's desktop screenshot shows the toolbar partly obscured by the Windows taskbar. Editor preview/browser layout checks did not reveal this. The user requested documentation without a fix; future positioning work must verify complete visibility and clickability around desktop shell surfaces. See [native desktop lessons](desktop-lessons.md).

Use the [operating guide](operating-guide.md) with a temporary imported project. Record actual results and hardware before marking these complete.

- Editor import, editor preview, installed-project/native property presence, and desktop display are user-confirmed as described above. Rebuild/update synchronization and any remaining property display conditions still need acceptance.
- Repeat startup with development servers/Node stopped and network access unavailable. Native rendering is confirmed, but those exact operating conditions were not established by the screenshots.
- Select a real image and a 150+ image folder in the native panel. Confirm natural order, shuffle, manual history, and finite failed-image skipping.
- Add, modify, remove, and rename files in that selected folder. Confirm actual native directory notifications and visible updated pixels; test folder replacement/disconnection.
- Set Fit/Fill, solid/blurred backgrounds, all transitions, and timing in the native panel. Check that changed host values clear matching local overrides.
- Exercise actual host pause rules and resume during both a hold and a transition; check remaining time is preserved.
- Change the global FPS setting (including low rates); measure actual presentation cadence during a transition and confirm static idle behavior.
- Use pointer navigation and overlay controls; verify available keyboard forwarding without changing security settings. Confirm disabling controls removes shortcuts.
- Restart the native wallpaper and check saved override persistence, reset, and storage isolation between project/profile locations.
- Inspect the inset scrollbars at top/bottom, focus outlines, small windows, high-DPI displays, and forced-colors mode.
- Repeat large-photo cycles on the target monitors, including 4K/ultrawide/multiple monitors; monitor the actual host/browser process and GPU memory over a longer run.

The framework is implemented, browser-verified, and user-confirmed to import and display through the native editor/desktop workflow. The remaining checks limit broader host compatibility and performance claims.
