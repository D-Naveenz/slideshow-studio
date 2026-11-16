# Wallpaper framework architecture

## Current state and target

The Vite migration and dependency updates are complete. The application now displays a static sample and builds a local wallpaper package with a buffered host callback bridge. Playback, settings, and rendering features below describe the approved target design and are not yet implemented. See [implementation status](implementation-plan.md).

Retain Vite, React, TypeScript, React Compiler, and Oxlint. Node runs development and build tools only. The final wallpaper package will contain `index.html`, local JavaScript/CSS/assets, sample images, and `project.json` in `dist/`. Use relative asset references and a classic JavaScript bundle to avoid runtime module imports. No external fonts, CDN dependencies, runtime server, or required network access.

The wallpaper fills its viewport, including unusual aspect ratios, without scrollbars or the browser Fullscreen API.

## Implemented packaging boundary

Vite builds the React entry in IIFE library mode. A build-only plugin emits production HTML from the development HTML template after stylesheet generation, replacing the module entry with a classic script and adding the emitted stylesheet. The public directory supplies project metadata, the synchronous bridge, favicon, and sample images. Builds also include project and bundled-dependency licenses.

`public/wallpaper-bridge.js` installs `window.wallpaperPropertyListener` from the document head before the app entry runs. Its typed contract is in `src/wallpaper/bridge.d.ts`. It queues user/general properties, pause changes, and directory changes/removals until one consumer calls `window.wallpaperBridge.connect(consumer)`. Connection drains queued events synchronously in arrival order; its returned function disconnects the consumer. Reentrant callbacks stay ordered, repeated bootstrap execution is harmless, and a second simultaneous consumer is rejected.

The bridge is transport only in batch 2: the static app does not consume or apply host settings. The adapter introduced in batch 3 will connect it to settings and catalogue state. Browser tests simulate early host events; real host behavior remains unverified.

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

WebGL is the primary renderer. Reuse image textures for foreground and background; produce the covered background through reduced-resolution separable blur passes. Fit contains the sharp foreground; Fill covers the viewport. Fit backgrounds can be blurred image copies or a solid color.

Provide fade, slide, and instant transitions. Image hold time begins after a transition completes; manual navigation restarts it. Pause/resume preserves remaining playback time without catching up missed slides.

Render only during transitions or invalidation. Pace animation updates using Wallpaper Engine's FPS setting, with a 30 FPS browser-preview default. Provide an HTML/CSS canvas fallback and handle WebGL context loss, resource disposal, and restoration. Recalculate rendering and prepared-resource sizing on viewport changes.

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

Expose playback and appearance settings through `project.json` and a dark, keyboard-accessible overlay. The toolbar offers previous, play/pause, next, and settings. Reveal it on pointer movement; hide after three seconds of inactivity unless hovered or focused. Keep the settings overlay usable while open.

Support Left/Right for navigation, Space for play/pause, S for settings, and Escape to dismiss, where Wallpaper Engine forwards input. Ignore playback shortcuts in form controls. Document input-forwarding requirements.

Persist overlay overrides locally. Startup precedence is defaults → Wallpaper Engine values → saved overrides. Subsequent changed host properties clear corresponding overrides; provide a reset to host settings. Native image/folder selections are owned by Wallpaper Engine and are not saved as overlay file selections. Unavailable local storage must not prevent session operation.

## Verification boundaries

Each code batch must pass build, lint, and relevant tests. Verify browser behavior and the built local-file package separately from real Wallpaper Engine behavior. Final integration covers offline startup without Node, native properties, directory updates, pause/FPS handling, input forwarding, multiple aspect ratios, large images, and context loss.

Measure resource/frame behavior on the actual test system, document unverified scenarios, and avoid hardware-independent performance claims.
