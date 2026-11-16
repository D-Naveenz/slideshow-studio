# Native desktop lessons and deferred usability work

These v1.0 findings guide future desktop work. The user explicitly deferred the toolbar fix. [Retained screenshots](evidence/README.md) illustrate editor import, native properties, desktop rendering, and the taskbar overlap.

## Toolbar overlaps the taskbar

**Observed:** In the user's desktop screenshot, the bottom-centered toolbar is partly covered by the Windows taskbar. Its upper edge and parts of the controls are visible above the taskbar, while the lower portion is obscured. The editor preview shows the complete toolbar, so the editor and browser screenshots did not expose this usability problem.

The current layout anchors the toolbar near the bottom of the wallpaper viewport. That viewport cannot be assumed to exclude desktop shell surfaces. Fitting inside the browser canvas is therefore insufficient: a control must also remain visible and clickable on the actual desktop.

**Deferred:** Reconsider the toolbar's default location and clearance. Evaluate configurable positioning/margins or another unobtrusive placement, rather than choosing a fixed offset from one screenshot. Do not assume browser CSS safe-area values describe the Windows taskbar. Check what reliable work-area/host information is available before depending on it.

For a future change, verify:

- The complete toolbar and click targets remain clear of the taskbar, including when it appears after auto-hide.
- Different display sizes, DPI/scaling, taskbar sizes/placements where supported, and multiple monitors do not recreate the overlap.
- Controls do not obscure commonly used desktop icons or require moving the pointer onto the taskbar to reach them.
- Pointer reveal, keyboard focus, focus return, and auto-hide still work at the revised location.
- The settings dialog remains reachable and fits independently of the toolbar's position.

The toolbar fix is deferred. The desktop observation comes from the user's supplied screenshot, not an agent live desktop capture.

## Initial import is a distinct workflow

The successful user-demonstrated workflow is **Wallpaper Editor → Create Wallpaper → drop `dist/index.html` → review full-folder import/project name → OK → wait for preview/autosave → close editor → select/apply the saved project**.

Opening a loose file, launching a pop-out window, and controlling an already known wallpaper are different operations. Earlier CLI/offline-file attempts did not establish whether editor import worked. In particular, selecting `project.json` in the offline-file picker registered a local scene; it did not create the intended editor-managed web project.

Use the [operating guide](operating-guide.md) for the import procedure. Do not repeat project creation or deletion merely to obtain another screenshot. Reuse the user's working project for subsequent authorized checks.

## Keep development, build, and installed copies distinct

The Vite development app, repository `dist/`, and Wallpaper Engine's imported project are separate copies. Rebuilding the repository does not establish that the installed wallpaper was updated.

The existing local project was found at:

```text
C:\Program Files (x86)\Steam\steamapps\common\wallpaper_engine\projects\myprojects\slideshow_studio
```

Pre-release read-only checks confirmed its title/type/entry as **Slideshow Studio / web / index.html**, matching then-current JS/CSS/bridge hashes, an active configuration reference, and visible native properties. Later builds, including the visible v1.0 version label, do not automatically update this installed copy. This is a machine-specific discovery, not a deployment path to hard-code.

For future updates, the expected approach is to update the existing imported project's runtime assets, preserve editor identity/metadata, merge property-definition changes deliberately, and reload. The official documentation supports editing the copied project files, but this repository has not yet validated an automated synchronization/reload procedure against this installation. Do not claim that deleting/recreating is required, or that unattended local deployment already works. Build/test/package automation and native installation/reload verification are separate concerns.

## Attribute evidence precisely

- User screenshots confirm editor import, editor rendering with the toolbar, installed-project/native property presence, and desktop display. They also expose the taskbar overlap.
- Agent read-only checks confirm the installed project's identity, matching build artifacts, active configuration reference, and visible native properties. Seeing a property is not proof that every change reaches the renderer.
- Browser tests confirm offline packaging, rendering effects, settings behavior, and resource bounds under those browser test conditions. They do not certify desktop shell interaction, native directory notifications, or host pause/input/storage behavior.
- Earlier native pop-out captures were black even for a minimal static HTML probe. The cause was not established. Those captures are not evidence that the correctly imported project fails, and the user's later successful import supersedes that broad interpretation.
- A screenshot does not identify the rendering backend, prove continuous slideshow timing, or establish long-term process memory stability.

## Retain performance and dependency lessons

Use established libraries for their strengths: PixiJS for GPU rendering/filtering, Radix Dialog for modal focus behavior, and Lucide for icons. Application-specific host settings, source catalogues, bounded preparation, and pause/history semantics still need explicit ownership and tests.

Native CSS was sufficient for themed scrollbars. Rounded panels also require clearance at both ends of the scrollbar track; thumb color/roundness alone did not address the user's concern. Verify styling in the embedded host as well as browser screenshots.

The raster stress runs used 150 paths with repeated upscaled photograph contents, warm caches, and two cycles. Retained prepared resources and GPU handles plateaued, but large-image work still produced long tasks. The 256 MiB figure estimates owned resources; it is not a browser-process limit or a promise of smooth playback. Keep the [measured method and limitations](verification.md) attached to future performance claims.

## Future verification practice

Check an existing working installation first. Keep editor preview, actual desktop usability, and browser automation as distinct verification targets. Use minimal probes to narrow failures, but stop repeating a failing opening route once a different valid route is known. Avoid changing unrelated wallpapers, global pause rules, security settings, or the user's working project without task authorization.

Record manual limitations and deferred improvements normally. They do not justify restarting the completed commit-batch/`continue` loop. The current outstanding native checks remain in [verification.md](verification.md).
