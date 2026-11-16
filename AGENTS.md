# Slideshow Studio agent instructions

## Git Workflow Rule
- NEVER run `git commit` or `git push`.
- When you finish writing and verifying code changes, stop execution immediately, summarize what you changed, and tell the user: "Ready for your custom git commit. Reply 'continue' once you have committed."
- Do not proceed to any further tasks until the user replies.

Implement one batch from [the implementation plan](docs/implementation-plan.md) per user commit. Do not combine later batches into the current changes. On `continue`, inspect Git history and status to confirm the previous batch was committed before starting the next. Preserve unrelated user changes; never reset, discard, stage, or amend them on the user's behalf. The user handles commit generation and Gitmoji-style messages.

## CodeGraph

Before locating or understanding code, check for a `.codegraph/` index at the repository root or an ancestor and reuse an existing project index. Prefer `codegraph_explore` with an explicit `projectPath` if an MCP tool is available. Otherwise use `codegraph explore "<symbol names or question>"`. Naming a file or symbol returns its current source; do not reread the same source unnecessarily.

If no project index exists and the CLI is available, run `codegraph init --yes` at the repository root and verify a small query. Initialization is authorized. Do not install CodeGraph automatically. If tools are unavailable or initialization fails, report the limitation briefly and use `rg` and normal file inspection.

The current environment has CodeGraph installed outside `PATH`. PowerShell fallback:

```powershell
& "$env:APPDATA\npm\codegraph.cmd" explore "App in src/App.tsx"
```

Keep generated databases and caches out of Git. Preserve CodeGraph's generated `.codegraph/.gitignore` rules.

## Architecture boundaries

- The existing Vite, React, TypeScript, React Compiler, and Oxlint setup is the baseline. Do not migrate frameworks or make unrelated dependency upgrades.
- Wallpaper Engine runs browser HTML, CSS, and JavaScript. Node is for development/build tooling only. The final package must run offline with local assets and no server.
- React owns controls and settings UI. Image decoding, caching, playback timing, and per-frame rendering belong outside React's render cycle.
- Keep the Wallpaper Engine adapter, settings, image catalogue, playback controller, resource cache, and renderer separated through typed interfaces.
- Directory enumeration collects paths, not decoded images. Bound prepared image resources, discard stale asynchronous results, and release evicted resources.
- Register host callbacks before application initialization. Treat host property events as partial updates.
- Follow [the architecture document](docs/architecture.md) for defaults, settings precedence, rendering behavior, and scope. Audio visualization, video, and animated-image playback are deferred.

## Validation and reporting

- Run `pnpm build` for TypeScript project checks and the production build, and `pnpm lint` for Oxlint. These are the current validation scripts.
- Run focused automated tests as test infrastructure is added; document new commands in the README. Do not claim a test command exists before it does.
- Verify packaged local-file startup and actual Wallpaper Engine integration in the batches that introduce them. A development-server preview does not establish host compatibility.
- Record each batch's changes, check results, and outstanding verification in `docs/implementation-plan.md` before the commit handoff. Keep documentation aligned with implemented capabilities.
- Report unavailable checks explicitly. The prepared-resource budget is an estimate, not a hard process-memory guarantee; do not promise stutter-free playback on all hardware.
