# Slideshow Studio agent instructions

## Git Workflow Rule
- NEVER run `git commit` or `git push`.
- When an agreed task is split into separate commit batches, implement and verify one batch at a time. If another actionable batch remains, summarize the completed batch and stop with: "Ready for your custom git commit. Reply 'continue' once you have committed."
- Wait for the user's reply before starting that next batch. On continuation, inspect Git history and status to confirm the previous batch was committed.
- When the final batch or a standalone task is finished, summarize the result and checks normally. Do not request 'continue', imply more implementation is pending, or require a commit acknowledgement when no further batch remains.
- Unverified manual checks, environment limitations, and optional future enhancements do not by themselves justify a commit/continue loop. Report them clearly without inventing another batch.

When the current task has an agreed implementation plan, use it to identify remaining batches; do not combine batches intended for separate commits. Completed plans are disposable: move lasting decisions, operating knowledge, and verification evidence into the relevant docs, then remove the plan. Use Git history for implementation chronology. A new request can proceed without commit acknowledgement for a completed task. Preserve unrelated user changes; never reset, discard, stage, or amend them on the user's behalf. The user handles Gitmoji-style commit generation.

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
- Run `pnpm test` for unit checks and the relevant package/browser suites (`pnpm test:package`, `pnpm test:browser`). Run `pnpm test:stress` when changing image preparation/rendering/resource behavior or updating performance claims. Suite runners may be used against one final build to avoid repeated builds.
- Verify packaged local-file startup and actual Wallpaper Engine integration in the batches that introduce them. A development-server preview does not establish host compatibility.
- Read [native desktop lessons](docs/desktop-lessons.md) before future host verification or desktop control-layout changes. Reuse the existing imported project when appropriate; distinguish initial editor import, installed-file updates, and runtime reloads.
- Validate desktop controls against taskbar/icon occlusion on the actual desktop. Passing browser/editor viewport checks does not establish usable desktop positioning. The toolbar/taskbar overlap is documented and deferred at the user's request.
- Keep architecture, operating instructions, release notes, and verification results aligned with the implementation. Record active multi-commit progress in that task's temporary plan, if one exists; do not recreate a completed historical plan.
- `package.json` is the application version source. Follow [release guidance](docs/releases.md); keep application release versions separate from persisted-settings schema versions. Never overwrite the user's installed wallpaper as part of a routine build.
- Report unavailable checks explicitly. The prepared-resource budget is an estimate, not a hard process-memory guarantee; do not promise stutter-free playback on all hardware.
