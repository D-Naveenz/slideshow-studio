# Slideshow Studio agent instructions

## Git workflow

- NEVER run `git commit` or `git push`. Preserve unrelated changes; never reset, discard, stage, or amend them. The user handles Gitmoji-style commits.
- Follow agreed commit batches one at a time; do not combine them. After verifying a batch, if another actionable batch remains, summarize and stop with: "Ready for your custom git commit. Reply 'continue' once you have committed."
- Wait for that reply; inspect Git history/status to confirm the prior commit before starting the next batch.
- Final batches and standalone tasks end normally without a commit acknowledgement or `continue`. Unverified manual checks, environment limits, and optional enhancements do not create another batch. New requests may proceed after completed work.
- Keep active progress in the task's temporary plan when one exists. Transfer lasting decisions/evidence to relevant docs, then remove completed plans. Use Git for chronology; do not recreate historical plans.

## CodeGraph

Before locating/understanding code, check for an index at the repository root or an ancestor and reuse it. Check MCP/CLI availability; prefer `codegraph_explore` with explicit `projectPath`, otherwise `codegraph explore "<symbols or question>"`. Naming a file/symbol returns current source; avoid rereading it.

If no index exists and CLI is available, initialization with `codegraph init --yes` is authorized; verify a small query. Never install CodeGraph automatically. If unavailable or initialization fails, briefly report and use `rg`/normal inspection.

Windows fallback outside PATH:

```powershell
& "$env:APPDATA\npm\codegraph.cmd" explore "App in src/App.tsx"
```

Keep databases/caches out of Git and preserve generated `.codegraph/.gitignore` rules.

## Architecture and targeted reading

- [Product direction](docs/product-direction.md): read for feature/scope decisions. Favor a lightweight, English-first slideshow framework and future creator reuse. Decorative systems/unrelated media are outside the core; video, animated playback, and audio visualization remain deferred.
- [Architecture](docs/architecture.md): read relevant contracts before changes. Retain Vite/React/TypeScript/React Compiler/Oxlint without unrelated upgrades. Runtime is offline browser HTML/CSS/JS with local assets and no Node/server.
- Keep adapter, settings, catalogue, playback, resource cache, and renderer separated through typed interfaces. React owns UI, not decoding/timing/frame work. Enumerate paths without decoding; bound preparation, discard stale results, release evictions. Register callbacks before initialization and treat host events as partial patches.
- [Operating guide](docs/operating-guide.md): build/import/diagnosis. [Desktop lessons](docs/desktop-lessons.md): required before host verification or desktop layout changes. Reuse an appropriate working import; distinguish initial import, installed updates, and runtime reloads.
- [Release guidance](docs/releases.md): `package.json` is the application-version source, independent of storage schemas. Never overwrite the installed wallpaper as part of a routine build.

## Validation and documentation

- Run `pnpm build`, `pnpm lint`, `pnpm test`, and relevant `pnpm test:package` / `pnpm test:browser`. Run `pnpm test:stress` for preparation/rendering/resource changes or updated performance claims. Direct suite runners may share one final build; see [verification](docs/verification.md#run-the-checks).
- Verify packaged local-file startup and native integration in batches introducing them. Browser/dev-server checks do not establish host compatibility. Test actual desktop taskbar/icon clearance for control-layout changes; the current overlap fix is deferred.
- Keep contracts, operating instructions, release notes, and evidence aligned. Give each topic one primary home and link instead of duplicating; use source/CodeGraph for recoverable implementation detail. Reference analysis is optional background, not routine reading.
- Report unavailable checks and distinguish fresh results from historical/user-supplied evidence. The prepared-resource budget is an estimate, not a process-memory guarantee; never promise universal stutter-free playback.
