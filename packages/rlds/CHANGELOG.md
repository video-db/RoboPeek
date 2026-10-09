# @videodb/robopeek-rlds

## 0.2.0

### Minor Changes

- [#2](https://github.com/video-db/RoboPeek/pull/2) [`a0b5c79`](https://github.com/video-db/RoboPeek/commit/a0b5c79c64e5cea636b45e31130c9517b0b4d839) Thanks [@omgate234](https://github.com/omgate234)! - Add `rgbaAt`, `rawRange` and `frameCount`: RGBA pixels for raw (numeric tensor) image tracks, without React or the DOM.

## 0.1.0

### Minor Changes

- [`3ee5ff2`](https://github.com/video-db/RoboPeek/commit/3ee5ff2b9d9f27ef4cee96690854dfb5fd333cd8) Thanks [@omgate234](https://github.com/omgate234)! - First public release. `@videodb/robopeek-rlds` reads RLDS episodes from TFRecord shards in the browser (stream a whole shard, or open one episode by index with HTTP Range requests). `@videodb/robopeek-react` adds a shard viewer, an episode viewer, a composable player (`Player.Root` and its parts), data hooks and themeable styles.
