# Slideshow Studio

A wallpaper slideshow framework for Wallpaper Engine, built with Vite, React, and TypeScript. The target is a self-contained HTML/CSS/JavaScript wallpaper that fills the viewport, cycles local images, and runs offline without Node.

The current build plays a fullscreen slideshow with natural ordering, shuffle, configurable hold time, and bounded image preparation. Browser preview supports local image/folder selection and navigation. Four sample images are included under `public/wallpapers/`. This batch uses instant swaps and Fill sizing; transitions, Fit/blur, and the desktop toolbar arrive in later batches. The package has been checked in an offline browser; actual Wallpaper Engine integration is not yet verified.

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

Project metadata lives in the root `project.json`. The build generates `dist/project.json` properties from the same definitions used for settings validation, so property keys, defaults, and slider bounds stay consistent. Source, hold time, shuffle, and host pause updates drive playback. Transition, Fit/blur, and end-user control effects are implemented in subsequent batches.

## Image source preview

`pnpm dev` enables the development preview panel automatically. To inspect the built package, open `dist/index.html` in a browser and append `?preview=1` to its address. The panel is hidden in the normal production wallpaper.

Choose bundled samples, a single image, or a folder. Browser selections are session-only, filter out unsupported extensions, and keep object URLs for loading; replacing selections releases their old URLs. The catalogue shows at most four names and a total count, even for large folders. Playback prepares only neighboring images, rather than loading the whole catalogue.

The panel includes previous, play/pause, and next controls, the current filename, and estimated prepared-resource usage. Expand **Simulate Wallpaper Engine events** to change hold time/shuffle, send FPS/pause updates through the callback bridge, and inspect received settings. Zero FPS means uncapped; animation frame pacing arrives with the animated renderer. Real Wallpaper Engine users select files/folders through its native panel; the directory property uses `fetchall` to receive paths and change/removal notifications.

Supported catalogue extensions are JPEG/JPG, PNG/PNGA, WebP, BMP, GIF, SVG, and AVIF. Actual decoding depends on the embedded browser; video and animated playback are outside this release.

## Playback and resource use

- Natural filename order is the default. Shuffle visits each available image once per cycle and avoids immediate cycle-boundary repeats. Previous/next follows actual visits, retaining up to 512 history entries. Changing the catalogue or shuffle setting starts a new shuffle cycle.
- Hold time starts when a prepared image is displayed (30 seconds by default). Manual navigation restarts the hold. Host pause, hidden-document suspension, and the preview pause control preserve remaining time; all active pause reasons must clear before the timer resumes.
- One worker loads/decodes candidates sequentially. It keeps the current image visible while waiting for the next one; repeated navigation requests are coalesced while a move is pending. A single-image source stays static.
- At most three prepared slides are retained, prioritizing current/incoming/next over older history. Prepared images are resized to useful viewport resolution, with an 8192-pixel side limit. The display canvas is capped at 8,388,608 pixels.
- The 256 MiB estimate includes a 48 MiB render reserve and conservative eight-bytes-per-pixel prepared allocations (canvas plus a future GPU texture). Previous resources are evicted before adding extra candidates. Browser decoding, native caches, and temporary source allocations are outside this estimate, so it is not a process-memory cap.
- Failed images are skipped for their current revision without endless retries. Reselecting a source or changing a file makes it eligible again; native file requests use revision tokens to bypass stale image-cache entries. Empty and all-failed selections show a status message. Source changes discard stale results; resizing keeps the old prepared image visible until its replacement is ready.

The canvas redraws on image/settings/viewport changes and has no continuous rendering loop. Heavy source decoding and downsampling can still stall on some hardware; full 4K/8K performance measurements belong to the final verification batch.

## Tests

```sh
pnpm test
pnpm test:package
pnpm test:browser
```

- `pnpm test` runs bridge, settings, URL, catalogue, adapter, ordering, clock, resource-budget, and playback-race tests with Node's built-in test runner and native TypeScript stripping. TypeScript tests are also checked by `pnpm build`.
- `pnpm test:package` builds and checks project metadata, local asset references, classic script syntax, absence of runtime module/Node imports, license files, and intact sample images.
- `pnpm test:browser` builds and opens packages directly through `file://` in offline Playwright contexts. It checks relocated packages, landscape/portrait/ultrawide windows, early events, file/folder inputs, bounded loading from large catalogues, timing/pause/navigation, failed-image recovery, oversized source preparation, and resize. It starts no server.

For browser tests, either install Playwright Chromium with `pnpm exec playwright install chromium`, or select an existing supported browser. For Microsoft Edge in PowerShell:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
pnpm test:browser
```

Screenshots and failure traces are written under the ignored `test-results/` directory. Browser tests verify the package in Chromium/Edge; they do not establish compatibility with Wallpaper Engine's embedded browser.

## Project documentation

- [Architecture and approved defaults](docs/architecture.md)
- [Implementation batches and verification status](docs/implementation-plan.md)
- [Agent instructions and commit workflow](AGENTS.md)
- [Wallpaper Engine web API reference](https://docs.wallpaperengine.io/en/web/overview.html)

Development proceeds one batch per user commit. Agents do not commit or push; they stop after verification and wait for `continue` after the user commits.

CodeGraph is initialized locally. Its generated index is ignored by Git; see `AGENTS.md` for exploration commands and the Windows CLI fallback.

## License

See [LICENSE.txt](LICENSE.txt) for the GNU General Public License v3 terms.
