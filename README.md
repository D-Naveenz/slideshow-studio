# Slideshow Studio

A wallpaper slideshow framework for Wallpaper Engine, built with Vite, React, and TypeScript. The target is a self-contained HTML/CSS/JavaScript wallpaper that fills the viewport, cycles local images, and runs offline without Node.

The repository currently contains the Vite starter, React Compiler, Oxlint, and four sample images under `public/wallpapers/`. Slideshow functionality and Wallpaper Engine packaging are planned in separate implementation batches; the current build is not yet a verified Wallpaper Engine wallpaper.

## Development

Use Node and pnpm for development and builds:

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

`pnpm build` runs TypeScript project checks and builds into `dist/`. `pnpm preview` serves that build for browser inspection. Automated slideshow tests and local-file packaging checks will be added in later batches.

## Project documentation

- [Architecture and approved defaults](docs/architecture.md)
- [Implementation batches and verification status](docs/implementation-plan.md)
- [Agent instructions and commit workflow](AGENTS.md)
- [Wallpaper Engine web API reference](https://docs.wallpaperengine.io/en/web/overview.html)

Development proceeds one batch per user commit. Agents do not commit or push; they stop after verification and wait for `continue` after the user commits.

CodeGraph is initialized locally. Its generated index is ignored by Git; see `AGENTS.md` for exploration commands and the Windows CLI fallback.

## License

See [LICENSE.txt](LICENSE.txt) for the GNU General Public License v3 terms.
