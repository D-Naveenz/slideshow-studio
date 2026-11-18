# Build, import, and operate

## Development and package

Use Node 24 and pnpm:

```sh
pnpm install
pnpm dev
pnpm build
```

`pnpm dev` provides hot reload; `pnpm preview` serves the build for browser inspection. Neither establishes native compatibility. The complete `dist/` folder is the wallpaper: HTML, classic JavaScript, CSS, callback bridge, generated `project.json`, `version.json`, sample images, favicon, and licenses. Ship this folder without source, `node_modules`, or test fixtures. Playback needs no Node, pnpm, server, or network.

The ReUI/shadcn interface uses Tailwind 4 CSS and requires Chrome 111+ (including compatible embedded Chromium hosts). All component code, CSS and icons are bundled locally; registry access is only needed during development. The [architecture](architecture.md#packaging-and-initialization) records component setup and maintenance requirements.

The settings footer shows the running version; `version.json` identifies a package without running it. See [release guidance](releases.md) and [verification commands](verification.md#run-the-checks).

## Initial Wallpaper Engine import

1. Open Wallpaper Engine's **Wallpaper Editor**.
2. Drag **`dist/index.html`** onto **Create Wallpaper** in the welcome/new-project window.
3. In **New Web Wallpaper**, name the project and review the complete built-folder import. Click **OK**.
4. Wait for rendering and autosave, then close the editor.
5. Select the saved project in the main window. Confirm native source, timing, transition, sizing, background, and controls properties appear; apply it to the desktop.
6. Begin with bundled samples, then select external images.

This workflow is [user-confirmed](evidence/README.md). CLI controls, loose-file opening, and pop-out previews are separate operations. For host testing, first read [desktop lessons](desktop-lessons.md).

### Updating an imported project

Rebuilding only changes repository `dist/`. Updating the imported copy and reloading the wallpaper are separate steps. Back up installed files/metadata, preserve editor identity/Workshop fields, replace runtime assets deliberately, and merge changed generated property definitions before reloading. Automated synchronization/reload remains unvalidated. Routine builds must never overwrite an installed wallpaper.

## Sources and controls

In native properties, set **Image source** to **Single image** or **Image folder**, then choose the file/folder. A selector alone does not activate its source mode. Bundled samples provide a recovery source for unavailable drives or empty selections. Folder enumeration collects paths; preparation loads only neighboring candidates. Failed revisions are skipped; reselecting the source or receiving a modification event permits retry.

Accepted extensions: JPEG/JPG, PNG/PNGA, WebP, BMP, GIF, SVG, and AVIF. Decoding depends on the embedded browser and native picker filters. Treat animated formats as still-image inputs; export unsupported files to JPEG, PNG, or WebP.

Fill crops to cover; Fit preserves the image over a solid color or blurred duplicate. Hold begins after transition completion; slow preparation retains the old image. Manual moves while paused swap instantly and keep playback paused. Shuffle visits all available entries before repeating; previous/next follows actual visits. See [architecture defaults and contracts](architecture.md).

Move the pointer or Tab to reveal the toolbar. It hides after three seconds unless hovered, focused, or settings are open. Native **Enable navigation and settings overlay** disables controls and shortcuts together. Pending/unavailable navigation is disabled.

The compact glass toolbar shows Previous, numbered image buttons, Next, Pause/Resume and Settings. Click a number to jump to its image; larger collections show ellipses between the visible numbers. Numbers follow the collection's natural filename order, including during shuffle. Previous/Next follow visit history, so Previous returns to the image shown before a jump. The active number is highlighted; current/total is also announced for screen readers (0/0 for an empty collection). No filename is displayed.

| Shortcut | Action |
| --- | --- |
| Left / Right | Previous / next |
| Space | Toggle user pause |
| S | Open settings |
| Escape | Close settings |

Fields and buttons retain normal key behavior. Host keyboard forwarding remains unverified; use pointer controls/native properties where keys are unavailable. The dialog supports Tab, Escape, focus return, and small-screen scrolling.

The toolbar defaults to **Top center**. Under **Controls**, choose Top/Bottom/Left/Right center and **Edge clearance (pixels)** (8–256; default 24). Side placements use a vertical toolbar. Increase clearance for bottom placement to clear the taskbar, or choose an edge away from desktop icons. These settings are also available in Wallpaper Engine’s native properties if the overlay is obstructed. Small windows reduce rendered clearance as needed without changing the saved value. Settings remain centered and scroll independently.

The settings heading and close button stay visible while scrolling through Playback, Appearance and Controls. Dropdowns retain native keyboard behavior; Shuffle uses a switch and Blur strength uses an accessible slider. Hold time, duration and edge clearance have compact decrement/increment number fields; values can also be typed or changed with arrow keys. Duration is disabled for Instant transitions. The whole interface follows the OS light/dark preference, including live changes. The toolbar uses light frosted glass or dark acrylic with clear resting buttons and distinct tinted hover, pressed and selected glass states, separated from pagination by a divider. Settings and developer panels keep solid backgrounds in both themes; no theme selector is exposed.

The original v1.0.0 bottom toolbar could overlap the taskbar. Configurable placement addresses that limitation, but actual desktop taskbar/icon clearance still needs native acceptance; browser containment alone does not establish it.

Settings saves playback, appearance, and toolbar placement overrides locally. Initial host settings load beneath saved overrides; later changed host values clear matching overrides. **Reset to Wallpaper Engine settings** restores the latest host values, including placement. Paths, master switch, and pause do not persist through the overlay. Storage failures leave session controls usable; persistence depends on origin/profile. Exact precedence belongs in [architecture](architecture.md#settings-and-persistence).

## Preview and diagnostics

Development automatically shows the preview panel. For a built package, open `dist/index.html` directly in a browser and append `?preview=1` to its URL. Normal production hides the panel. Browser file/folder selections are session-only and release their object URLs on replacement. The catalogue displays at most four names plus a total count.

Preview tools use the same ReUI/shadcn component system in a separate Card and remain available when the production overlay is disabled. Expand **Simulate Wallpaper Engine events** to edit host settings; its numeric fields support typing and stepping, including zero for uncapped FPS. These fields simulate host changes and follow host precedence, while the settings dialog edits local overrides.

The panel shows current filename, backend, failures, and estimated prepared resources. **Simulate Wallpaper Engine events** sends timing, appearance, shuffle, FPS, and pause changes through the real bridge. These mocks do not establish native event behavior. Append `&renderer=canvas` to force Canvas2D.

Host FPS paces transitions; zero means uncapped and static slides schedule no frames. Large decode/upload work can still stall. Use resized local copies when responsiveness matters. See [resource contracts](architecture.md#sources-and-resource-lifecycle) and [measured performance](verification.md#measured-results), rather than treating the resource estimate as a process-memory limit.

Ordinary browsers can reject GPU uploads from direct `file://` image paths; the app then falls back to Canvas2D. Browser imports use blob URLs to exercise WebGL. That security behavior is separate from Wallpaper Engine's embedded runtime.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Empty source | Source mode, supported files, permissions, and drive/share availability. |
| All images fail | Open a file independently; fix corruption/format/access, then reselect the source. |
| Old build or missing properties | Update the imported copy, preserve generated `general.properties`, and reload. |
| Native setting seems ineffective | Reset local overrides, then change the native value. Repeated host values preserve overrides. |
| Playback remains paused | Host/hidden-document pause can remain after user pause clears. |
| Saved settings disappear | Storage availability, clearing, package location, and profile; native persistence is unverified. |
| Controls/shortcuts absent | Native master switch, pointer/Tab reveal, and host input forwarding. |
| No blurred background | Select Fit and Blurred image. |
| Cycling stalls | Try smaller JPEG/WebP copies; native decoding allocations are outside the resource estimate. |
| Black/wrong pixels after GPU issues | Try Canvas2D and reload; record backend, device/driver, and source format. |
