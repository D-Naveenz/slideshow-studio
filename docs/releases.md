# Releases and versioning

## Unreleased

Production and developer controls now use ReUI and shadcn Radix Nova components with Tailwind 4, preserving existing preference contracts and following the OS light/dark theme across the entire application. The toolbar adapts the compact pagination-card example with a light frosted or dark acrylic surface, a divider before playback/settings buttons with clear resting backgrounds, raised tinted hover/selected surfaces, inset pressed surfaces and subtle glass edge/contact shadows, numbered image navigation with ellipses, an accessible current/total status and no filename. Button presses and focus rings no longer create spurious toolbar scrollbars. Settings retain their fixed heading/close control and scrolling body; numeric fields use ReUI decrement/increment controls. Developer tools use a separate standard Card and the same form components. Dialogs and developer panels stay solid, and theme changes apply live without resetting playback or edits. All assets remain offline/local. CSS requires Chrome 111+; the JavaScript target is unchanged.

Toolbar placement now defaults to top center, with top/bottom/left/right anchors and configurable edge clearance in native properties and the settings overlay. Saved placement follows existing override/reset rules without migrating v1 preferences. Small viewports clamp rendered clearance and side anchors use vertical controls. Offline browser verification is recorded in [verification](verification.md); native taskbar/icon, DPI and multi-monitor acceptance remains pending. No application-version bump yet.

## 1.0.0 — 2026-11-16

Initial offline slideshow foundation: local image/folder sources, natural ordering and shuffle/history, configurable fade/slide/instant transitions, Fill/Fit with blurred/solid backgrounds, bounded sequential preparation, WebGL/Canvas2D rendering, and accessible controls with saved appearance/playback settings.

[Verification](verification.md) records browser checks, raster stress results, and user-confirmed editor import/desktop display. The taskbar can obscure the toolbar; its fix is deferred. Native directory/pause/FPS/input/storage and multi-monitor acceptance remains incomplete. The resource budget estimates owned resources, not process memory or universal smoothness.

Video, animated playback, audio visualization, preset publishing, and unattended installed-project updates are outside this release. Existing native screenshots predate the visible version label; the installed copy was not automatically upgraded.

## Version contract

`package.json.version` is the semantic application version. Use patch for compatible fixes, minor for compatible features, and major for incompatible public behavior/settings contracts. Bump deliberately during release preparation; ordinary builds do not increment it.

Vite injects the version at build time for the settings footer, root `.wallpaper-shell` `data-version`, `version.json`, and HTML `application-version` metadata. Runtime version identification works offline without fetching package files/services. Restart the development server after a version change.

Application versions, persisted-settings schema versions, and Wallpaper Engine project identity are independent. Do not reset preferences merely for an app-version change; migrate changed schemas explicitly. Preserve editor/Workshop identity during installed updates.

## Release procedure

1. Update the application version, release notes, and affected contracts/procedures/evidence.
2. Run the [verification checks](verification.md#run-the-checks). Include stress for preparation/rendering/resource changes or new performance claims; record conditions and limitations.
3. Confirm package/visible versions, local assets, notices, and known issues. Ship complete `dist/` contents.
4. Follow the [operating guide](operating-guide.md) for first import or deliberate installed-project updates. Routine builds never deploy automatically.
5. Verify actual desktop behavior as well as browser/editor views; scope host changes to the authorized project and attribute evidence precisely.

Use Git for implementation chronology. Transfer lasting knowledge from temporary plans into these documents and remove completed plans. Agents never commit or push.
