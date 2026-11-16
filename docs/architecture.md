# Wallpaper framework architecture

## Current state and target

The Vite migration and dependency updates are complete. The application plays a slideshow through a bounded preparation worker and PixiJS WebGL renderer, with Canvas2D fallback, fade/slide/instant transitions, Fit/Fill sizing, and solid/blurred backgrounds. Validated host settings and source catalogues drive playback. A React toolbar and accessible settings dialog provide end-user controls and persisted appearance/playback overrides. A separate development panel supports imports and mock host events. Final native integration and photographic stress measurements remain batch 7. See [implementation status](implementation-plan.md).

Retain Vite, React, TypeScript, React Compiler, and Oxlint. Node runs development and build tools only. The final wallpaper package will contain `index.html`, local JavaScript/CSS/assets, sample images, and `project.json` in `dist/`. Use relative asset references and a classic JavaScript bundle to avoid runtime module imports. No external fonts, CDN dependencies, runtime server, or required network access.

The wallpaper fills its viewport, including unusual aspect ratios, without scrollbars or the browser Fullscreen API.

## Implemented packaging boundary

Vite builds the React entry in IIFE library mode. A build-only plugin emits production HTML from the development HTML template after stylesheet generation, replacing the module entry with a classic script and adding the emitted stylesheet. The public directory supplies the synchronous bridge, favicon, and sample images. The root `project.json` supplies project metadata; the plugin generates its user properties from the runtime's settings definitions. Builds also include project and bundled-dependency licenses.

`public/wallpaper-bridge.js` installs `window.wallpaperPropertyListener` from the document head before the app entry runs. Its typed contract is in `src/wallpaper/bridge.d.ts`. It queues user/general properties, pause changes, and directory changes/removals until one consumer calls `window.wallpaperBridge.connect(consumer)`. Connection drains queued events synchronously in arrival order; its returned function disconnects the consumer. Reentrant callbacks stay ordered, repeated bootstrap execution is harmless, and a second simultaneous consumer is rejected.

The bridge connects to `WallpaperRuntime` before asynchronous renderer initialization and React mounting. Browser tests simulate early host events. A native rendering smoke test passed using injected callbacks; full native property-panel behavior remains unverified.

## Implemented settings and catalogue boundary

`settings.ts` defines stable lowercase property keys, runtime types, defaults, slider bounds, options, and display conditions. `settingsPatch` accepts only known own properties, preserves missing values, rejects malformed types/options, clamps sliders, and converts host color channels to hex. `projectProperties` generates matching host definitions. The keys are `source`, `imagefile`, `imagedirectory`, `holdseconds`, `transition`, `transitionseconds`, `shuffle`, `fit`, `background`, `backgroundcolor`, `blur`, and `controls`.

`WallpaperRuntime` exposes immutable cached snapshots and subscriptions for React through `useSyncExternalStore`. It consumes buffered/live events, retains the last valid FPS (initially 30; zero means uncapped), and stores host pause state. Property changes are incremental. The playback controller consumes source, timing, shuffle, pause, appearance, and FPS changes. `SettingsPreferences` owns the latest host values and validated overlay overrides separately, so reset can restore current host settings.

`ImageCatalogue` stores image IDs, names, URLs, and revisions only. It retains native directory references while another source is selected, updates revisions for modified files, and removes entries by canonical identity. Windows drive and UNC identities are case-insensitive; POSIX identities retain case. Raw paths encode literal URL-reserved characters; already encoded `file://` URLs retain their escaping. Relative paths and non-file URL schemes are rejected. When directory location properties are available, replacement retains entries already received for the new root and excludes old-root entries; `fetchall` change/removal callbacks also work without a directory location value.

Browser imports own session object URLs and release them on replacement, clearing, disposal, or failed partial import. The catalogue never decodes images; the playback worker requests only the current and neighboring entries. The development preview is enabled by Vite dev mode or `?preview=1`; normal production hides it. Its host mocks use the real global callbacks. It is separate from the end-user settings overlay, which edits runtime overrides without pretending to be host input.

## Implemented playback boundary

`PlaybackController` subscribes to runtime inputs outside React. Its single async worker handles initial selection, coalesced navigation, and neighbor prefetch. Generation checks and abort signals invalidate stale work, and a replacement preparation cannot start until the previous preparation promise settles. Changed revisions become eligible again; failed revisions are removed from the available order without repeated timer retries.

`PlaybackOrder` naturally sorts names, maintains a shuffled bag with no cycle-boundary repeat, and keeps actual visit history (up to 512 entries). Catalogue or shuffle changes reconfigure the cycle while retaining valid current/history entries. `HoldClock` and an injectable scheduler preserve remaining holds through overlapping host, user, and document-visibility pauses. Manual navigation resets the hold; automatic playback waits for readiness and never catches up a queue of missed slides.

`ResourceCache` reserves the in-flight slot as part of its three-slide limit before preparation starts. Priority is current, requested incoming, next, then previous; older history is evicted first. Each prepared canvas is bounded by useful screen resolution, the GPU texture side limit (at most 8192), and a third of the available prepared-resource budget. The estimate reserves 112 MiB for the display, two composed slides, blur targets, and overhead, then accounts eight bytes per prepared pixel within 256 MiB total. These are conservative owned-resource estimates, excluding native browser decode/cache allocations. Eviction releases GPU resources before clearing prepared canvases.

`prepareImage` uses asynchronous image loading/decoding with cancellation and a 30-second timeout that clears the source; it downsamples to a retained canvas and releases the source image reference. Native file requests include a revision query token so modification callbacks cannot silently reuse a previous browser-cached image. Preparation is serialized even if a custom loader ignores cancellation. Cache eviction resets prepared canvas dimensions. Resize keeps the current image while re-preparing it and clears the old backing store before assigning new dimensions to avoid oversized intermediate allocations. Source removal/clearing releases invalid prepared resources. Disposal unsubscribes inputs, cancels timers/loads, and releases late results.

The display is capped at 8,388,608 pixels and the supported texture side length. `ResilientRenderer` chooses PixiJS WebGL or Canvas2D and owns fallback/restoration. A separate transition clock and injectable frame scheduler keep animation outside React. Transition setup finishes before its clock starts; a fresh hold begins after the final frame. Pauses freeze both clocks; manual moves while paused are instant. Source/order changes cancel an active transition while retaining a valid outgoing slide. Resize completes a ready incoming slide before re-preparing at the new dimensions.

## Responsibilities and data flow

| Subsystem | Responsibility |
| --- | --- |
| Wallpaper Engine adapter | Install callbacks synchronously before application startup, buffer early events, and translate partial property/directory/FPS/pause updates. |
| Settings store | Validate defaults and incoming values; merge host settings and overlay overrides. |
| Image catalogue | Maintain source metadata and file paths, normalize local URLs, and apply directory changes without eager decoding. |
| Playback controller | Select images, maintain shuffle/history, coordinate timing and readiness, and preserve remaining time across pauses. |
| Resource cache | Serialize candidate preparation, retain a bounded set of screen-sized images, and dispose stale/evicted resources. |
| Renderer | Draw the current/prepared incoming slide, transitions, and backgrounds independently of React updates. |
| React UI | Expose navigation, preview inputs, status, and an accessible settings overlay. |

Host or preview input updates settings/catalogue. The playback controller chooses an entry, requests resource preparation, and starts rendering only when the next image is ready. React subscribes to meaningful state changes rather than per-frame progress.

Browser preview provides file/folder selection and mock host events. Wallpaper Engine image/folder selection stays in its native properties panel. Host callbacks must safely handle initialization before the UI is ready and updates containing only some properties.

## Sources, ordering, and resource lifecycle

- Sources are explicit: bundled samples, one imported image, or an imported directory. Support browser-decodable still images; defer video, animated-image playback, and audio visualization.
- Use directory `fetchall` callbacks to collect paths, not image contents. Apply added, modified, and removed entries; handle spaces, Unicode, reserved URL characters, and UNC paths safely.
- Use natural filename order by default. Shuffle visits every image once per cycle and avoids an immediate repeat at cycle boundaries when multiple images exist. Previous navigation follows actual playback history.
- Prepare at most previous/current/next slides. Decode one candidate at a time, retain the displayed image while waiting, and discard stale work after source changes.
- Resize prepared images to useful viewport resolution within GPU texture limits. Target a 256 MiB estimated owned-resource budget including rendering reserves; evict previous-slide resources first and lower prepared resolution when needed.
- Temporary native decoding allocations and browser-managed resources prevent this estimate from being a hard process-memory cap. Large-file latency remains hardware-dependent.
- Release resources when evicted. Skip failed images without endless retries; make changed files eligible for preparation again. Empty sources show an unobtrusive status; single-image sources remain static.

## Rendering and playback

`PixiRenderer` uses PixiJS 8's `WebGLRenderer`, shared `CanvasSource` textures, sprites, render textures, and its separable `BlurFilter`. It uses no `Application`, asset loader, or animation ticker; the controller owns preparation and scheduling. PixiJS maintenance and interaction tickers are disabled because resources and UI input have explicit owners. Prepared GPU source textures are warmed during prefetch. At most two slide compositions are retained. The foreground and covered background share a source texture; blur passes use a resolution capped to a 512-pixel longest dimension. Fit contains the sharp foreground; Fill covers the viewport. Fit backgrounds can be blurred image copies or a solid color.

Fade blends complete opaque slide compositions; slide moves them in the navigation direction. The active transition captures its effect/duration, while appearance changes invalidate compositions immediately. Image hold time begins after a transition completes; manual navigation restarts it. Pause/resume preserves remaining playback time without catching up missed slides.

Render only during transitions or invalidation. Animation uses the host FPS cap, preserving fractional frame intervals, with a 30 FPS browser-preview default. Static slides schedule no frames. Canvas2D caches the same complete compositions and uses reduced-resolution canvas blur. Unsupported WebGL or rendering failures select this fallback. Context loss temporarily selects Canvas2D; restoration invalidates lost render-texture contents and rebuilds GPU compositions. Disposal releases source textures, compositions, blur pools, canvases, listeners, and timers. Recalculate rendering and prepared-resource sizing on viewport changes. `?renderer=canvas` explicitly selects the fallback for diagnosis.

## Settings and interaction

| Setting | Approved default |
| --- | --- |
| Image source | Bundled samples |
| Hold time | 30 seconds |
| Transition | Fade |
| Transition duration | 1 second; ignored for instant transitions |
| Shuffle | Off |
| Sizing | Fill |
| Fit background | Blurred image |
| Background color | Black |
| Blur strength | 24 screen pixels |
| Navigation and settings overlay | Enabled |

Playback and appearance settings are exposed through `project.json` and a dark, keyboard-accessible overlay. `WallpaperControls` provides previous, play/pause, next, and settings with named Lucide SVG icons. It reveals on pointer movement or keyboard focus and hides after three seconds unless hovered, focused, or the dialog is open. Hidden buttons stay in the tab order so keyboard focus can reveal them. The native controls property unmounts the toolbar/dialog and removes listeners/timers. Navigation is disabled while a move is pending or unavailable; empty sources also disable pause.

`SettingsPanel` uses Radix Dialog for modal focus trapping, dismissal, and focus return. Native labeled inputs/selects retain their keyboard behavior. Its scrollable layout and sticky close/header keep it usable in small viewports. Neither component owns frame rendering; React receives meaningful runtime/playback snapshots only. Both dependencies are built into the local classic bundle; no runtime downloads or new service dependencies are introduced.

Support Left/Right for navigation, Space for play/pause, S for settings, and Escape to dismiss, where Wallpaper Engine forwards input. Ignore playback shortcuts in form controls. Document input-forwarding requirements.

`SettingsPreferences` persists an allowlist of hold/transition/shuffle/fit/background/color/blur values under `slideshow-studio.preferences.v1`, with a versioned JSON envelope and shared validation. Startup precedence is defaults → Wallpaper Engine values → saved overrides. All events drained synchronously during bridge connection preserve overrides; the first valid later host event also counts as initial settings if none were buffered. Subsequent values that differ from the last host values clear corresponding overrides and update storage. Repeated or unrelated host values preserve them. Reset removes overrides and restores the latest host values.

Native source/image/folder selection, the master controls switch, and pause state are never persisted by the overlay. Getter/write/removal failures and corrupt or unknown-version records leave session operation usable. Local storage scope depends on browser origin/profile; file-package moves and different hosts may expose different records. Native storage/input behavior remains to be verified in batch 7.

## Verification boundaries

Each code batch must pass build, lint, and relevant tests. Verify browser behavior and the built local-file package separately from real Wallpaper Engine behavior. Final integration covers offline startup without Node, native properties, directory updates, pause/FPS handling, input forwarding, multiple aspect ratios, large images, and context loss.

Measure resource/frame behavior on the actual test system, document unverified scenarios, and avoid hardware-independent performance claims.
