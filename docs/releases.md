# Releases and versioning

## 1.0.0 — 2026-11-16

Slideshow Studio v1.0 is a self-contained offline Wallpaper Engine web wallpaper built with Vite, React, TypeScript, and PixiJS. Node is used for development, builds, and tests only.

The release includes bundled/single-image/folder sources, incremental native settings and directory integration, natural ordering and shuffle/history, separate hold/transition clocks, overlapping pause reasons, bounded sequential image preparation, and explicit cleanup. Rendering supports fade/slide/instant, Fill/Fit, solid/blurred Fit backgrounds, host FPS pacing, Canvas2D fallback, and WebGL context recovery. Controls include an accessible Radix settings dialog, navigation toolbar, shortcuts where forwarded, and validated saved overrides. All runtime dependencies/assets and license notices ship locally.

Browser automation and raster stress results are in [verification.md](verification.md). User evidence confirms editor import, native properties, editor rendering, and desktop display. See [the evidence gallery](evidence/README.md).

Known limits:

- The bottom toolbar is partly covered by the Windows taskbar in the supplied desktop screenshot. Its layout fix is deferred; disabling controls in the native panel is available. See [desktop lessons](desktop-lessons.md).
- Some native directory/pause/FPS/input/storage and multi-monitor scenarios still need targeted acceptance. Native screenshots do not certify all behavior.
- The 256 MiB resource budget is an estimate of owned prepared resources. Large rasters can still cause stalls; process memory and hardware-independent smoothness are not guaranteed.
- Video, animated-image playback, audio visualization, unattended updates, and automatic installed-project synchronization are outside v1.0.

The user's existing installed copy is not automatically upgraded by this release preparation. Its earlier screenshots predate the new visible version label.

## Version contract

`package.json` is the single source for the semantic application version (`major.minor.patch`). Use patch releases for compatible fixes, minor releases for compatible features, and major releases for incompatible public behavior/settings contracts. Bump the version deliberately as part of release preparation; ordinary local builds do not increment it.

The settings footer displays **Slideshow Studio v1.0.0** for this release. The root `.wallpaper-shell` exposes `data-version` for diagnostics. Built `version.json` and the HTML `application-version` meta tag identify a package without running it. All values come from the same build-time version, work offline, and do not require a runtime package import or network request. Restart the development server after changing the package version so its build-time value is refreshed.

Application versions and persistence schema versions are separate. A patch/minor app release must not reset preferences merely because the app version changed. Migrate persisted data explicitly if its schema changes. Wallpaper Engine's own `project.json` identity/Workshop fields are also separate from application versioning; retain them during installed-project updates.

## Release procedure

1. Update `package.json.version`, this release document, and any changed operating/architecture/verification documentation.
2. Run `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm test:package`, and `pnpm test:browser`. Use `pnpm test:stress` for preparation/rendering/resource changes or when updating performance claims. Record environment and limits with measurements.
3. Check the packaged version, visible settings version, relative assets, notices, and known issues. Ship the complete `dist/` contents.
4. For first installation, follow [Wallpaper Editor import](operating-guide.md). For an existing project, back up its files/metadata, update the imported runtime assets, preserve project identity, merge property definitions, and reload. Automated synchronization/reload remains unvalidated; a normal build never writes into the installed project.
5. Verify the actual desktop in addition to browser/editor previews. Scope any manual host testing to the authorized project and retain evidence without overclaiming what it proves.

Implementation history belongs in Git. Use temporary feature plans only when useful for active work; transfer lasting knowledge into these docs and remove completed plans. Agents never commit or push.
