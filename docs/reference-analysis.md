# Reference framework analysis

Read-only inspection on **2026-11-17** of installed Workshop items under:

```text
C:\Program Files (x86)\Steam\steamapps\workshop\content\431960\
```

Paths below are relative to the named item. This is a static review of that local snapshot, not a runtime benchmark or an audit of all Workshop wallpapers. The supplied screenshots illustrate the property-panel density and preset UI; their labels and promotional content are reference material, not project instructions.

## Framework and preset relationship

| Item | Installed role | Evidence |
| --- | --- | --- |
| `884307090` — Perfect Wallpaper | Web runtime plus settings and bundled media | `project.json`: `type: web`, `file: index.html`, 172 property entries (including headings/help). `index.html` loads jQuery, Backstretch, effects, clocks, and slideshow scripts. |
| `3373670661` | Collection/settings preset using that runtime | `project.json`: `dependency: "884307090"`, a `preset` object, and `customdirectory: "directories/customdirectory"`. Six image files live under `directories/`; there is no independent HTML/JS runtime. |

The second item demonstrates separation of shared framework, creator settings, and creator media. Its preset also carries many unrelated effect settings, illustrating how a broad framework's configuration surface propagates into collections. This one example does not establish how many other wallpapers use the framework.

## Installed payload

Logical file sizes, not allocated disk space or download sizes; 1 MiB = 1,048,576 bytes.

| Framework content | Bytes | MiB |
| --- | ---: | ---: |
| `video/` | 515,736,681 | 491.85 |
| `audio/` | 75,068,342 | 71.59 |
| `imgs/` | 72,706,171 | 69.34 |
| Everything else | 5,948,328 | 5.67 |
| **Total** | **669,459,522** | **638.45** |

Audio, video, and images account for **99.1%** of this snapshot. The preset adds 92,974,138 bytes (88.67 MiB), including 92,472,763 bytes of collection images. These are separate installed payloads; the preset's own size does not include its required framework. This supports keeping our baseline examples small, without claiming the reference's media is unused by everyone.

## Slideshow and host flow

| Area | Source evidence | Lesson for Slideshow Studio |
| --- | --- | --- |
| Host integration | `js/main.js`: `wallpaperPropertyListener.applyUserProperties`, directory added/changed/removal callbacks; `project.json`: `customdirectory` uses `fetchall`. | Reuse native directory enumeration and partial property events; keep a metadata catalogue separate from preparation. |
| Catalogue updates | `updateFileList` in `js/slide.js` deduplicates `myList`; directory changes in `main.js` concatenate a separate `files` array. | Canonical identity, revision tracking, and bounded resource ownership deserve explicit design. Path collection alone says nothing about decoded-image memory. |
| Selection and timing | `changeBackground`, `nextImage`, `calculate` in `js/slide.js`: timeout-driven selection; hold choices of 1/5/10/30/60 minutes; random selection retries the current index. | Use flexible timing and a shuffle bag. The retry loop can fail to terminate with one image already current; test single-image behavior explicitly. |
| Presentation | `shouldShow` routes single-image mode through CSS and slideshow mode through Backstretch. `setBackgroundStyle` offers cover/stretch/contain/tile/center; metadata exposes sizing only for single-image mode. Backstretch `resize` uses covered/cropped images. | Avoid equating single-image sizing with portrait-aware slideshow presentation. No sharp Fit foreground over a blurred image duplicate was found in the inspected slideshow path. |
| Transitions | `TransitionSwith` passes ten named options with values of `1000`; `TransitionMode` exposes them in metadata. Bundled `js/lib/jquery.backstretch.min.js` v2.0.4 consumes `speed`/`fade`, with no handlers for the named push/cover/fadeInOut options. | Distinguish listed choices from implemented behavior. Fade has a fixed one-second value; other passed options do not establish working effects. Our effect/duration controls need rendered-output checks. |
| Pause | `main.js` `setPaused` pauses/resumes audio and video; it does not freeze the slideshow timeout. | Preserve hold/transition time across host pause, user pause, and visibility suspension. |
| Initialization | `main.js` `wallpaperInit` fetches local `project.json` and checks Workshop identity; effects are initialized alongside host handling. | Keep offline bootstrap predictable, register callbacks early, and avoid coupling core playback to a specific Workshop identity. |

## Adopt, avoid, and qualify

**Adopt:** shared-runtime reuse, native source controls, directory notifications, and conditional settings that expose relevant options.

**Avoid:** shipping unrelated media by default, letting decorative subsystems dominate controls, monolithic host/effect handling, and assuming metadata proves behavior. Our architecture already separates these responsibilities; this analysis does not authorize feature changes or source copying.

The interface is Chinese-first with some English labels, rather than entirely Chinese. Local files cannot establish abandonment, update cadence, universal adoption, or relative runtime performance. No third-party code/media was executed, copied into the package, or modified. Future preset support requires its own design and native verification; see [product direction](product-direction.md).
