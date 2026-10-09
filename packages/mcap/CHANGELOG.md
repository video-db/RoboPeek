# @videodb/robopeek-mcap

## 0.1.0

### Minor Changes

- [#2](https://github.com/video-db/RoboPeek/pull/2) [`a0b5c79`](https://github.com/video-db/RoboPeek/commit/a0b5c79c64e5cea636b45e31130c9517b0b4d839) Thanks [@omgate234](https://github.com/omgate234)! - First public release. Reads MCAP recordings (ROS 1, ROS 2, protobuf and JSON messages; zstd and lz4 chunks) in the browser or Node into time-aligned camera, signal and text tracks. Decodes H.264 video with WebCodecs and 16-bit depth PNGs, and keeps frame memory under a budget by fetching released frames back with HTTP Range requests.
