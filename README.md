# Slideshow Studio

A lightweight, English-first slideshow framework for Wallpaper Engine. Present local image collections with useful controls, predictable playback, and an offline package. Creator reuse through Workshop presets is a core future goal; this release supplies the slideshow foundation.

## Current capabilities

- Bundled samples, single images, and folders; natural ordering, shuffle, and navigation history.
- Fill or Fit sizing, including sharp portrait images over blurred or solid Fit backgrounds.
- Fade, slide, and instant transitions with configurable timing.
- Sequential, bounded image preparation; PixiJS WebGL rendering with Canvas2D fallback.
- Accessible navigation/settings controls and saved playback/appearance overrides.

**Known desktop limitation:** the bottom toolbar can be partly covered by the Windows taskbar. Its positioning fix is deferred. Editor import and desktop display are user-confirmed; broader native acceptance remains incomplete. See [verification](docs/verification.md).

## Quick start

Use Node 24 and pnpm for development:

```sh
pnpm install
pnpm dev
```

Build with `pnpm build`. Import **`dist/index.html`** through Wallpaper Engine's **Wallpaper Editor → Create Wallpaper**, including the complete built folder. See the [operating guide](docs/operating-guide.md) for installation, controls, preview, and troubleshooting. Playback needs no Node, server, or network. Rebuilding does not update an imported project automatically.

## Documentation

| Task | Read |
| --- | --- |
| Understand the purpose and feature priorities | [Product direction](docs/product-direction.md) |
| Develop within the system's contracts | [Architecture](docs/architecture.md) |
| Build, import, operate, or diagnose | [Operating guide](docs/operating-guide.md) |
| Run checks or assess measured results and remaining acceptance | [Verification](docs/verification.md) |
| Verify desktop behavior or change control placement | [Desktop lessons](docs/desktop-lessons.md) |
| Prepare a release or understand versioning | [Release guidance](docs/releases.md) |
| Examine the reference framework and preset model | [Reference analysis](docs/reference-analysis.md) |
| Inspect original native screenshots | [Evidence gallery](docs/evidence/README.md) |
| Work as an agent | [Agent instructions](AGENTS.md) |

Built with Vite, React, TypeScript, React Compiler, and Oxlint. Runtime dependencies and assets ship locally. License: [GNU GPL v3](LICENSE.txt).
