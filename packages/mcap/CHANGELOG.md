# @videodb/robopeek-mcap

## 0.1.1

### Patch Changes

- [#9](https://github.com/video-db/RoboPeek/pull/9) [`e44ff25`](https://github.com/video-db/RoboPeek/commit/e44ff25f1f669b39d08f5b23ac89ac54d5da5924) Thanks [@ashish-spext](https://github.com/ashish-spext)! - Declare the MIT license: `license: "MIT"` in the manifest and a `LICENSE` file in the published package.

## 0.1.0

### Minor Changes

- [#2](https://github.com/video-db/RoboPeek/pull/2) [`a0b5c79`](https://github.com/video-db/RoboPeek/commit/a0b5c79c64e5cea636b45e31130c9517b0b4d839) Thanks [@omgate234](https://github.com/omgate234)! - First public release. Reads MCAP recordings (ROS 1, ROS 2, protobuf and JSON messages; zstd and lz4 chunks) in the browser or Node into time-aligned camera, signal and text tracks. Decodes H.264 video with WebCodecs and 16-bit depth PNGs, and keeps frame memory under a budget by fetching released frames back with HTTP Range requests.
