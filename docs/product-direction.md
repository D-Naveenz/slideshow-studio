# Product direction

## Purpose and audience

Slideshow Studio exists to provide a solid, lightweight slideshow foundation for Wallpaper Engine. It serves people displaying their own local images and creators publishing collections and presets around a shared framework. English is the primary interface language; clear labels and focused controls matter more than the number of settings.

The motivation comes from using Perfect Wallpaper: its broad effects/media scope and dense, Chinese-first settings make a focused slideshow workflow harder to find. The goal is to improve that workflow, with image presentation and reliable playback receiving sustained attention. The [reference analysis](reference-analysis.md) records what the installed framework actually does and which lessons inform this direction.

## Priorities

| Priority | What it means |
| --- | --- |
| Image presentation | Handle mixed orientations and aspect ratios deliberately; preserve portraits with Fit and useful backgrounds. |
| Playback control | Make timing, transitions, ordering, navigation, and pause behavior understandable and predictable. |
| Efficient operation | Bound prepared resources, release unused work, and avoid continuous rendering of static slides. Measure costs rather than promise universal smoothness. |
| Offline simplicity | Ship local runtime assets; require no server, account, or network for playback. Keep bundled examples small and purposeful. |
| Creator reuse | Develop toward collections/settings that reuse a shared runtime instead of duplicating a large media/effects package. |
| Maintainability | Keep host integration, settings, catalogue, playback, resources, rendering, and UI independently understandable. |

## Foundation and future goals

The current release implements local sources, natural ordering, shuffle/history, configurable transitions, Fill/Fit, blurred/solid Fit backgrounds, bounded preparation, renderer fallback, and saved overlay settings. See the [architecture](architecture.md) for contracts and [verification](verification.md) for evidence and native gaps.

Workshop preset creation, distribution, compatibility policy, and publishing workflows are future work. The reference's dependency/preset model is useful inspiration, not an implemented Slideshow Studio feature or a promise of compatibility with its presets.

Video, animated-image playback, and audio visualization remain deferred. Clocks, weather, particles, decorative post-processing, and unrelated bundled audio/video are outside the core direction. They should not displace slideshow quality or enlarge the baseline package by default.

## Feature decisions

A proposed addition should solve an identifiable slideshow or creator problem, keep controls approachable, and justify its package/runtime/maintenance cost. Prefer a small coherent capability over a large option matrix. Use established libraries where they improve correctness; keep resource and lifecycle ownership explicit.

Retain durable decisions here, technical contracts in architecture, procedures in the operating guide, and evidence in verification. Use source/CodeGraph for implementation detail and Git for chronology; this document is not a feature backlog.
