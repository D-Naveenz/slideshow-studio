# Build, import, and operate Slideshow Studio

## Build a local wallpaper

Use Node 24 and pnpm for these development steps:

```sh
pnpm install
pnpm build
```

The wallpaper is the contents of `dist/`: HTML, classic JavaScript, CSS, callback bridge, `project.json`, `version.json`, sample images, favicon, and license notices. Keep these together. Ship only this folder, not source files, `node_modules`, or test fixtures. Node, pnpm, and a server are unnecessary on the playback machine. Find the running version at the bottom of the settings dialog; `version.json` identifies a built package without running it. See [release guidance](releases.md).

1. Open Wallpaper Engine's main window and click **Wallpaper Editor**.
2. In the editor's welcome/new-project window, drag `dist/index.html` onto **Create Wallpaper**.
3. In **New Web Wallpaper**, set the project name (for example, **Slideshow Studio**) and review the imported files. The editor imports the whole `dist/` folder, including local scripts, styles, metadata, licenses, and sample wallpapers. Click **OK**.
4. Wait for the wallpaper to render in the editor preview and for automatic saving to finish. Adjust the project title/configuration as needed, then close the editor.
5. Find **Slideshow Studio** in the main window. Its custom properties appear on the right, including source, timing, transitions, shuffle, sizing, backgrounds, and the controls switch.
6. Click the new wallpaper to apply it. Begin with bundled samples before selecting external images.

This editor import/application flow is user-confirmed in [the screenshot evidence](evidence/README.md), including imported files, editor preview/toolbar, installed project/native properties, and desktop display. See [the verification record](verification.md) for the limits of that evidence. Wallpaper Engine documents its [web project workflow](https://docs.wallpaperengine.io/en/web/first/gettingstarted.html) and [custom properties](https://docs.wallpaperengine.io/en/web/customization/properties.html).

The command-line controls for opening/controlling wallpapers do not perform this editor project-creation/import workflow. Direct offline-file opening and pop-out previews are also separate flows; they were not a substitute for verifying the editor import. Do not use the earlier black pop-out captures as evidence that this correctly imported project fails to render.

After rebuilding, update the editor's imported copy with the new build. It does not automatically follow repository builds. Back up editor-managed metadata and retain project identity fields. If properties are missing after an update, confirm `project.json` retains the generated `general.properties` definitions.

## Choose images

In Wallpaper Engine's properties panel, set **Image source** to **Single image** or **Image folder**, then select the image/folder. Use **Bundled samples** to recover from an unavailable external drive or empty selection. Changing a selector without changing the source mode does not activate that source.

Folder enumeration collects paths. A single worker prepares neighboring images only; it does not read all image contents when a directory is enumerated. Directory notifications update modified files and remove deleted entries. For a disconnected network share or inaccessible file, the app skips the failed revision; reselecting the source or receiving a modification event makes it eligible again.

JPEG/JPG, PNG/PNGA, WebP, BMP, GIF, SVG, and AVIF extensions are accepted. Actual decoding depends on the embedded browser and Wallpaper Engine's native picker filters. Treat GIF and other animated formats as still-image inputs; animation/video/audio visualization are outside this release. Export unsupported images to JPEG, PNG, or WebP.

## Playback and appearance

Defaults are a 30-second hold followed by a one-second fade, natural filename order, Fill sizing, and enabled controls. Hold time begins after each transition. Slow preparation leaves the old image visible until its replacement is ready. Pause preserves remaining transition/hold time; manual navigation while paused changes the image immediately and stays paused.

**Fill** covers the viewport by cropping. **Fit** keeps the full image visible and fills remaining space with either a solid color or a blurred covered duplicate. Blur strength is measured in screen pixels; it is processed at reduced resolution. Instant transitions ignore transition duration. Shuffle visits all available entries before repeating and previous navigation follows actual visits.

Move the pointer to reveal the toolbar. It hides after three seconds, stays visible during hover/focus or an open dialog, and reveals when tabbed to. Known v1.0 issue: it can sit partly behind the Windows taskbar; its positioning fix is deferred. The native controls switch hides it and disables its shortcuts. Left/Right navigate, Space toggles user pause, S opens settings, and Escape dismisses settings where the host forwards input. Native desktop keyboard forwarding is unverified; use pointer controls and host properties when keys are unavailable. Do not change operating-system or application security settings to enable shortcuts.

The settings dialog saves playback/appearance overrides locally. Initial host settings load beneath saved overrides. A later changed host value clears its matching override; unrelated values remain. Reset restores the latest host values. Source paths, the master switch, and pause state are never saved by the overlay. If storage is blocked/full, controls work for the current session. Persistence can differ across host profiles and package locations.

## Performance and diagnostics

- Wallpaper Engine's [global FPS setting](https://docs.wallpaperengine.io/en/web/performance/fps.html) paces transitions; zero means uncapped. Static slides do not schedule animation frames. Lower FPS reduces transition work, but does not remove image decoding/upload costs.
- The app caps prepared resources at three slides and an estimated 256 MiB including a 112 MiB rendering reserve. Images may be downsampled below source resolution. This excludes browser decoding, native image caches, and process overhead.
- Keep local resized copies of very large originals if responsiveness matters. In the measured stress run, an 84.8 MiB 8K PNG required about 1.85 seconds to become ready, and a main-thread task reached 757 ms. These are observations on one machine, not universal limits.
- Test the built package by opening `dist/index.html?preview=1` in a browser. The development panel shows source counts, backend, skipped images, current slide, and estimated prepared resources. It is hidden in normal production. Its event controls simulate the host; they do not prove native integration.
- Add `&renderer=canvas` to the preview URL to force Canvas2D. Normal startup chooses PixiJS WebGL and falls back if unavailable or an upload/render fails. WebGL context loss temporarily selects Canvas2D and restoration rebuilds GPU compositions.
- Ordinary browsers can reject GPU uploads of canvases drawn from direct `file://` image paths. The app then falls back; browser file/folder inputs use session blob URLs and exercise WebGL. This browser security behavior is separate from Wallpaper Engine's embedded runtime.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Empty source | Select the correct source mode and a nonempty supported folder/file. Confirm the drive/share is reachable. |
| All images fail | Open an image independently; check permissions, format support, and corruption. Reselect the source after fixing it. |
| Old image after rebuild | Update the editor's imported project copy, not just repository `dist/`. Restart that wallpaper. |
| Native properties missing | Confirm the imported `project.json` contains generated `general.properties`; the editor may have replaced metadata. |
| A panel change appears ineffective | Local overrides can mask repeated host values. Use Reset to Wallpaper Engine settings, then make the panel change. |
| Resume does not resume | Host or hidden-document suspension still applies even after user pause is cleared. Check Wallpaper Engine's pause rules and active applications. |
| Settings disappear on restart | Storage may be unavailable, cleared, or scoped to a different origin/profile. Native host persistence remains unverified. |
| Toolbar or shortcuts absent | Enable controls in the native panel, move the pointer, or Tab to the toolbar. Keyboard forwarding is host-dependent. |
| Blurred background absent | Select Fit and Blurred image; Fill has no empty areas to fill. |
| Noticeable pauses while cycling | Try smaller local JPEG/WebP copies. The resource estimate bounds owned retained resources, not temporary decode cost. |
| Black or wrong background after GPU issues | Try the Canvas2D diagnostic mode and restart the wallpaper; record backend/device/driver and source format for a reproducible report. |

## Reproduce verification

```sh
pnpm build
pnpm lint
pnpm test
pnpm test:package
pnpm test:browser
pnpm test:stress
```

For installed Edge in PowerShell, set `$env:PLAYWRIGHT_CHANNEL = 'msedge'` before browser/stress checks. The stress command generates seven large raster fixtures and 150 hard-linked JPEG paths in ignored `test-results/stress/`, then performs 310 manual moves and a large-PNG load. It uses NTFS/filesystem hard links to avoid duplicating the photos 150 times. Allow several minutes and several hundred MiB of temporary disk space; image generation/browser decoding can require substantially more transient RAM.

By default, stress uses browser imports and requires PixiJS WebGL. To measure ordinary-browser direct-file fallback separately, set `$env:STRESS_SOURCE = 'file'`; clear it afterwards with `Remove-Item Env:STRESS_SOURCE`. Optional `STRESS_MOVES` must be at least 300. Reports are `report-import.json` and `report-file.json` under the stress artifact directory. The normal browser suite never starts a server and runs offline. See [measured results and remaining native checks](verification.md).
