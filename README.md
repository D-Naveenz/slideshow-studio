# Slideshow Studio

A wallpaper slideshow framework for Wallpaper Engine, built with Vite, React, and TypeScript. The target is a self-contained HTML/CSS/JavaScript wallpaper that fills the viewport, cycles local images, and runs offline without Node.

The current build packages a static sample screen, an early Wallpaper Engine callback bridge, and four sample images under `public/wallpapers/`. Slideshow playback, image importing, and settings are added in later batches. The package has been checked in an offline browser; actual Wallpaper Engine integration is not yet verified.

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

For a manual Wallpaper Engine check, build first, then drag **`dist/index.html`** onto **Create Wallpaper** in the editor. Import only the built `dist/` folder, never the repository root or `node_modules`. Wallpaper Engine copies imported files into its project directory; rebuilding this repository does not update that copy automatically. This release displays one static sample and does not yet apply host settings.

## Tests

```sh
pnpm test
pnpm test:package
pnpm test:browser
```

- `pnpm test` runs the callback bridge tests with Node's built-in test runner.
- `pnpm test:package` builds and checks project metadata, local asset references, classic script syntax, absence of runtime module/Node imports, license files, and intact sample images.
- `pnpm test:browser` builds and opens relocated packages directly through `file://` in offline Playwright contexts. It checks landscape, portrait, and ultrawide windows, early host events, sample loading, overflow, and console/network failures. It starts no server.

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
