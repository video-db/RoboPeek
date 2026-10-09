---
"@videodb/robopeek-mcap": minor
"@videodb/robopeek-mcap-react": minor
---

First public release. `@videodb/robopeek-mcap` reads MCAP recordings (ROS 1, ROS 2, protobuf and JSON messages; zstd and lz4 chunks) in the browser into time-aligned camera, chart and text tracks, decodes H.264 video with WebCodecs and 16-bit depth PNGs, and keeps memory under a budget by fetching frames back with HTTP Range requests. `@videodb/robopeek-mcap-react` adds `McapViewer`, a time-based composable player (`Player.Root` and its parts), hooks and themeable styles.
