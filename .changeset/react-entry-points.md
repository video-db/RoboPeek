---
"@videodb/robopeek-react": minor
---

One package for every format. **Breaking:** RLDS viewers and hooks moved to `@videodb/robopeek-react/rlds`, and the RLDS reader is now an optional peer dependency: install `@videodb/robopeek-rlds` (0.2.0 or newer) next to this package; it is no longer installed or re-exported. `Player.Root` takes a `timeline` (use `<EpisodePlayer episode={…}>` or `useEpisodeTimeline`), and `step` / `fps` props are now `position` / `rate`. New: MCAP support under `@videodb/robopeek-react/mcap` (`McapViewer`, `McapPlayer`, `useRecording`; needs `@videodb/robopeek-mcap`), and a format-free root entry for your own data (`Timeline`, `frameCache`).
