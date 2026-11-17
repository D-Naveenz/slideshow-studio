# UI improvement work in progress

## Batch 1 — Toolbar placement

Implement top/bottom/left/right anchors (top center by default) and 8–256 CSS pixel clearance (24 by default). Expose native properties and saved overlay overrides with existing precedence/reset behavior. Clamp rendered layout on resize; preserve shortcuts, hiding and dialog access. Verify build, lint, unit, package and browser checks; distinguish native acceptance from browser evidence.

Status: implemented; final build/typecheck, lint, 54 unit, 5 package and 26 offline Edge browser tests pass. Native desktop acceptance is pending and the installed wallpaper has not been updated. Browser launch required execution outside the filesystem sandbox. Source, operating instructions, release notes and evidence are aligned. Waiting for the user's custom commit before batch 2; starting HEAD was f1e1322.

## Batch 2 — ReUI migration

After the user's batch 1 commit, inspect Git history/status before proceeding. Add Tailwind 4, shadcn and the free ReUI registry using Radix Nova and Lucide. Migrate all production controls, retaining green theme tokens and offline packaging; leave preview tools out of scope. Use operational, dense, Frame-led separator-based settings sections; preserve states and component-owned motion. Default dark with light tokens tested; no theme selector. Document Chrome 111+ CSS baseline. Discover APIs/examples and perform ReUI quality checks, then full verification. No rendering/resource changes or version bump planned.

Transfer durable decisions/evidence to the relevant docs and remove this temporary plan when complete. Never commit or push.
