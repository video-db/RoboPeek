---
"@videodb/robopeek-mcap": minor
---

First public release. Reads MCAP recordings (ROS 1, ROS 2, protobuf and JSON messages; zstd and lz4 chunks) in the browser or Node into time-aligned camera, signal and text tracks. Decodes H.264 video with WebCodecs and 16-bit depth PNGs, and keeps frame memory under a budget by fetching released frames back with HTTP Range requests.
