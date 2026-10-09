---
"@videodb/robopeek-rlds": minor
"@videodb/robopeek-mcap": minor
"@videodb/robopeek-react": minor
---

MCAP support, and one React package for every format. **Breaking:** RLDS viewers and hooks moved to `@videodb/robopeek-react/rlds`, and the readers are now optional peer dependencies: install `@videodb/robopeek-rlds` next to `@videodb/robopeek-react` (it is no longer pulled in or re-exported). `Player.Root` takes a `timeline` (use `<EpisodePlayer episode={…}>` or `useEpisodeTimeline`), and `step` / `fps` props are now `position` / `rate`. New: `@videodb/robopeek-mcap` reads MCAP recordings (ROS 1, ROS 2, protobuf, JSON; H.264 video, 16-bit depth, a memory budget with Range refetch), and `@videodb/robopeek-react/mcap` adds `McapViewer`, `McapPlayer` and `useRecording`. `@videodb/robopeek-rlds` adds `rgbaAt`, `rawRange` and `frameCount`.
