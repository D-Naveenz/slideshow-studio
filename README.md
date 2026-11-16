# Slideshow Studio

A wallpaper slideshow framework for Wallpaper Engine, built with Vite, React, and TypeScript. The target is a self-contained HTML/CSS/JavaScript wallpaper that fills the viewport, cycles local images, and runs offline without Node.

The current build plays a viewport-filling slideshow with natural ordering, shuffle, bounded image preparation, and fade, slide, or instant transitions. PixiJS renders Fill or Fit images with solid or blurred backgrounds; Canvas2D provides a fallback. A navigation toolbar and accessible settings dialog provide playback and appearance controls, with saved local overrides. Browser preview supports local image/folder selection. Four sample images are included under `public/wallpapers/`. Offline browser checks and a limited native Wallpaper Engine rendering preview have passed; full host integration verification remains pending.

## Development

Use Node 24 and pnpm for development and builds:

```sh
pnpm install
pnpm dev
```

Available checks and build commands:

```sh
pnpm lint
pnpm build
pnpm preview
```

`pnpm build` runs TypeScript project checks (including the plain JavaScript bridge) and builds into `dist/`. `pnpm preview` serves that build for browser inspection. Vite development uses modules and hot reload; production uses a classic JavaScript bundle.

## Wallpaper package

The build outputs `index.html`, `wallpaper.js`, `wallpaper.css`, `wallpaper-bridge.js`, `project.json`, a local favicon, sample images, and license notices. All runtime assets are local and use relative paths. Node and a web server are not needed to open `dist/index.html`.

For a manual Wallpaper Engine check, build first, then drag **`dist/index.html`** onto **Create Wallpaper** in the editor. Import only the built `dist/` folder, never the repository root or `node_modules`. Wallpaper Engine copies imported files into its project directory; rebuilding this repository does not update that copy automatically.

Project metadata lives in the root `project.json`. The build generates `dist/project.json` properties from the same definitions used for settings validation, so property keys, defaults, and slider bounds stay consistent. Source, timing, transitions, shuffle, Fit/Fill, backgrounds, and host pause/FPS updates drive playback.

## Wallpaper controls

Move the pointer to reveal the bottom toolbar. It offers previous, play/pause, next, and settings, and hides after three seconds unless hovered, focused, or the settings dialog is open. Keyboard focus also reveals hidden controls. Unavailable navigation buttons are disabled; system pause remains effective even if you clear your own pause.

The settings dialog controls hold time, shuffle, transition/duration, sizing, and Fit backgrounds. It supports Tab navigation, Escape dismissal, focus return, and scrolling on small screens. [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog) supplies focus management and modal behavior; [Lucide React](https://lucide.dev/guide/react/) supplies bundled SVG icons. Image/folder selection and the master **Enable navigation and settings overlay** switch stay in Wallpaper Engine's properties panel. Turning that switch off also disables wallpaper shortcuts.

| Shortcut | Action |
| --- | --- |
| Left / Right | Previous / next image |
| Space | Toggle your playback pause |
| S | Open settings |
| Escape | Close settings |

Shortcuts work only where the host forwards keyboard input. Editing fields and activating buttons retain their native keyboard behavior. Browser tests verify these interactions; native desktop input forwarding remains for the final host verification batch. Use the clickable controls and native properties panel when keyboard events are unavailable.

Overlay playback/appearance changes are saved in versioned local storage. Startup resolves defaults → initial host settings → saved overrides. All buffered startup settings, or the first later host settings event, preserve saved overrides. Subsequent host values that change clear matching overrides; unrelated or repeated values preserve them. **Reset to Wallpaper Engine settings** clears all local overrides and restores the latest host values. Image paths, folder selections, the master switch, and pause state are not saved by the overlay.

Blocked storage, full storage, and corrupt preferences leave session controls usable. Persistence depends on the browser origin/profile; moving the package or using another host can change the available saved settings. Reload persistence is verified in Edge; Wallpaper Engine storage behavior remains for final integration testing.

## Image source preview

`pnpm dev` enables the development preview panel automatically. To inspect the built package, open `dist/index.html` in a browser and append `?preview=1` to its address. The panel is hidden in the normal production wallpaper.

Choose bundled samples, a single image, or a folder. Browser selections are session-only, filter out unsupported extensions, and keep object URLs for loading; replacing selections releases their old URLs. The catalogue shows at most four names and a total count, even for large folders. Playback prepares only neighboring images, rather than loading the whole catalogue.

The panel includes previous, play/pause, and next controls, the current filename, renderer, and estimated prepared-resource usage. Expand **Simulate Wallpaper Engine events** to change timing, transitions, sizing, backgrounds, and shuffle, send FPS/pause updates through the callback bridge, and inspect received settings. Zero FPS means uncapped. Real Wallpaper Engine users select files/folders through its native panel; the directory property uses `fetchall` to receive paths and change/removal notifications. Append `?preview=1&renderer=canvas` to test the Canvas2D fallback explicitly.

Supported catalogue extensions are JPEG/JPG, PNG/PNGA, WebP, BMP, GIF, SVG, and AVIF. Actual decoding depends on the embedded browser; video and animated playback are outside this release.

## Playback and resource use

- Natural filename order is the default. Shuffle visits each available image once per cycle and avoids immediate cycle-boundary repeats. Previous/next follows actual visits, retaining up to 512 history entries. Changing the catalogue or shuffle setting starts a new shuffle cycle.
- Hold time starts after the transition completes (30 seconds by default, with a one-second fade). Manual navigation restarts the hold. Host pause, hidden-document suspension, and the preview pause control preserve remaining hold/transition time; all active pause reasons must clear before playback resumes. Manual navigation while paused swaps immediately and leaves playback paused.
- One worker loads/decodes candidates sequentially. It keeps the current image visible while waiting for the next one; repeated navigation requests are coalesced while a move is pending. A single-image source stays static.
- At most three prepared slides are retained, prioritizing current/incoming/next over older history. Prepared images are resized to useful viewport resolution, with an 8192-pixel side limit. The display canvas is capped at 8,388,608 pixels.
- The 256 MiB estimate includes a 112 MiB render reserve for the display, two composed slides, and blur targets, plus conservative eight-bytes-per-pixel prepared allocations (canvas plus GPU source texture). Previous resources are evicted before adding extra candidates; GPU textures are released before their prepared canvases. Browser decoding, native caches, and temporary source allocations are outside this estimate, so it is not a process-memory cap.
- Failed images are skipped for their current revision without endless retries. Reselecting a source or changing a file makes it eligible again; native file requests use revision tokens to bypass stale image-cache entries. Empty and all-failed selections show a status message. Source changes discard stale results; resizing keeps the old prepared image visible until its replacement is ready.

PixiJS shares each prepared image texture between foreground and background. It composes slides once, blurs backgrounds at reduced resolution, and animates the resulting textures. Frames run only during transitions or invalidation, paced by the host FPS setting (30 FPS in preview by default). Static slides schedule no animation frames. Context loss switches to Canvas2D; restoration rebuilds GPU compositions. Heavy source decoding, texture uploads, and downsampling can still stall on some hardware; full 4K/8K performance measurements belong to the final verification batch.

## Tests

```sh
pnpm test
pnpm test:package
pnpm test:browser
pnpm test:stress
```

- `pnpm test` runs bridge, settings, URL, catalogue, adapter, ordering, clock, resource-budget, playback-race, and saved-override precedence/persistence tests with Node's built-in test runner and native TypeScript stripping. TypeScript tests are also checked by `pnpm build`.
- `pnpm test:package` builds and checks project metadata, local asset references, classic script syntax, absence of runtime module/Node imports, license files, and intact sample images.
- `pnpm test:browser` builds and opens packages directly through `file://` in offline Playwright contexts. It checks relocated packages, landscape/portrait/ultrawide windows, early events, imports, bounded loading, playback, failed-image recovery, oversized source preparation, resize, rendered transition/background pixels, idle frame scheduling, GPU texture eviction, and context loss/restoration. Overlay checks cover focus, shortcuts, auto-hide, disabled controls, settings precedence, reload persistence, and storage failures. Both PixiJS and Canvas2D are exercised. It starts no server.
- `pnpm test:stress` builds and runs 310 manual moves through 150 paths backed by generated 4K/8K photographic JPEG fixtures, then loads an 84.8 MiB noisy 8K PNG. It records prepared resources, texture counts, JavaScript heap, long tasks, and interaction latency under `test-results/stress/`. This optional check needs several minutes, temporary disk space, and substantial transient decoding memory. See the [method, hardware, results, and limits](docs/verification.md).

For browser tests, either install Playwright Chromium with `pnpm exec playwright install chromium`, or select an existing supported browser. For Microsoft Edge in PowerShell:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
pnpm test:browser
```

Screenshots and failure traces are written under the ignored `test-results/` directory. Browser tests verify the package in Chromium/Edge; they do not establish compatibility with Wallpaper Engine's embedded browser.

## Project documentation

- [Architecture and approved defaults](docs/architecture.md)
- [Implementation batches and verification status](docs/implementation-plan.md)
- [Build/import instructions and troubleshooting](docs/operating-guide.md)
- [Measured performance and native verification limits](docs/verification.md)
- [Agent instructions and commit workflow](AGENTS.md)
- [Wallpaper Engine web API reference](https://docs.wallpaperengine.io/en/web/overview.html)

Development proceeds one batch per user commit. Agents do not commit or push; they stop after verification and wait for `continue` after the user commits.

CodeGraph is initialized locally. Its generated index is ignored by Git; see `AGENTS.md` for exploration commands and the Windows CLI fallback.

## License

See [LICENSE.txt](LICENSE.txt) for the GNU General Public License v3 terms.
