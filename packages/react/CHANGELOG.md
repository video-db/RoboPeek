# @videodb/robopeek-react

## 0.3.0

### Minor Changes

- [#8](https://github.com/video-db/RoboPeek/pull/8) [`f95c18a`](https://github.com/video-db/RoboPeek/commit/f95c18a2f81179e8af288e79e16798dd9489c40d) Thanks [@omgate234](https://github.com/omgate234)! - Player hotkeys accept vim keys: `h`/`l` step (Shift = 10), `k`/`j` previous/next episode.

### Patch Changes

- [#9](https://github.com/video-db/RoboPeek/pull/9) [`e44ff25`](https://github.com/video-db/RoboPeek/commit/e44ff25f1f669b39d08f5b23ac89ac54d5da5924) Thanks [@ashish-spext](https://github.com/ashish-spext)! - Declare the MIT license: `license: "MIT"` in the manifest and a `LICENSE` file in the published package.

## 0.2.0

### Minor Changes

- [#2](https://github.com/video-db/RoboPeek/pull/2) [`a0b5c79`](https://github.com/video-db/RoboPeek/commit/a0b5c79c64e5cea636b45e31130c9517b0b4d839) Thanks [@omgate234](https://github.com/omgate234)! - One package for every format. **Breaking:** RLDS viewers and hooks moved to `@videodb/robopeek-react/rlds`, and the RLDS reader is now an optional peer dependency: install `@videodb/robopeek-rlds` (0.2.0 or newer) next to this package; it is no longer installed or re-exported. `Player.Root` takes a `timeline` (use `<EpisodePlayer episode={…}>` or `useEpisodeTimeline`), and `step` / `fps` props are now `position` / `rate`. New: MCAP support under `@videodb/robopeek-react/mcap` (`McapViewer`, `McapPlayer`, `useRecording`; needs `@videodb/robopeek-mcap`), and a format-free root entry for your own data (`Timeline`, `frameCache`).

## 0.1.0

### Minor Changes

- [`3ee5ff2`](https://github.com/video-db/RoboPeek/commit/3ee5ff2b9d9f27ef4cee96690854dfb5fd333cd8) Thanks [@omgate234](https://github.com/omgate234)! - First public release. `@videodb/robopeek-rlds` reads RLDS episodes from TFRecord shards in the browser (stream a whole shard, or open one episode by index with HTTP Range requests). `@videodb/robopeek-react` adds a shard viewer, an episode viewer, a composable player (`Player.Root` and its parts), data hooks and themeable styles.

### Patch Changes

- Updated dependencies [[`3ee5ff2`](https://github.com/video-db/RoboPeek/commit/3ee5ff2b9d9f27ef4cee96690854dfb5fd333cd8)]:
  - @videodb/robopeek-rlds@0.1.0
