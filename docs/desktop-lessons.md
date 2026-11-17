# Native desktop lessons

Read before host verification or desktop layout changes. [Original user evidence](evidence/README.md), supplied on 2026-11-16, confirms editor import and desktop display and exposes the deferred toolbar overlap. The acceptance-status record lives in [verification](verification.md).

## Desktop controls must clear shell surfaces

The bottom-centered toolbar fits in the editor preview but is partly hidden behind the Windows taskbar on the actual desktop. The user deferred its fix. Viewport containment alone does not establish usable placement, and CSS safe-area values must not be assumed to describe the Windows taskbar.

Future positioning work should evaluate configurable placement/margins or another unobtrusive location. Investigate reliable host/work-area information before depending on it; do not choose a universal offset from one screenshot.

Acceptance must cover:

- Complete visibility and click targets with a visible taskbar and after auto-hide reveal.
- Display sizes, DPI/scaling, taskbar sizes/placements where supported, and multiple monitors.
- Clearance from commonly used desktop icons and pointer access without entering the taskbar.
- Reveal, auto-hide, keyboard focus/return, and independent settings-dialog reachability.

For rounded settings panels, scrollbar track clearance at both ends matters as well as thumb styling. Verify scrollbars, focus outlines, and scrolling in the embedded host, including small windows and forced-colors mode.

## Import, update, and reload are separate

Use the [operating guide](operating-guide.md) for initial editor import. Loose-file opening, CLI controls, and pop-out previews do not create the same editor-managed project. Reuse a working imported project for authorized subsequent checks; avoid repeated creation/deletion merely to capture evidence.

Development, repository `dist/`, and the imported project are separate copies. A routine build does not update or reload the installed wallpaper. A previously discovered local project is:

```text
C:\Program Files (x86)\Steam\steamapps\common\wallpaper_engine\projects\myprojects\slideshow_studio
```

This machine-specific location is a discovery hint, not a deployment constant. Inspect the current installation first. Preserve editor identity/metadata, deliberately merge property changes, and distinguish file synchronization from runtime reload. Automated synchronization/reload remains unvalidated; do not assume deletion/recreation is required.

## Evidence and testing discipline

| Evidence | Establishes | Does not establish |
| --- | --- | --- |
| User screenshots | Visible import, editor rendering, native property presence, desktop display, taskbar overlap | Backend, event response, timing, storage, or memory behavior |
| Installed-file/config inspection | Identity, artifact equality at inspection time, configured project reference | The running process loaded those files or every property works |
| Offline browser automation | Behavior under the tested browser/package conditions | Embedded-host events or desktop shell usability |
| Raster stress measurements | Resource/latency observations for the recorded fixtures and hardware | Process-memory bounds, cold-disk performance, or universal smoothness |

Use minimal probes to narrow failures; once a valid import route is known, do not repeat a failing opening route as a substitute. Keep browser, editor, and desktop acceptance distinct. Do not change unrelated wallpapers, global pause rules, security settings, or installed project files without task authorization.
