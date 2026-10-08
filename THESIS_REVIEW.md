# Thesis review

## The plan

RLDS datasets ship as large shard files, each holding many episodes. RoboPeek ([THESIS.md](THESIS.md)) lets you preview one episode in the browser without downloading the whole shard. The thesis asked for a framework-independent library plus a small demo app, a UI package only if embedding needed one, and MCAP as the next format.

## What we built

`@robopeek/rlds` reads RLDS. It started life as `core` and was renamed before publishing, because everything in it is RLDS-specific. It splits a TFRecord file into records, decodes each `tf.train.Example`, and groups the keys into an episode (camera frames, numeric tracks, text, metadata). It can stream a whole shard, or fetch one episode by reading past the earlier ones without decoding them. All ten public datasets we tried load.

`@robopeek/react` is the UI: data hooks, small components, a player made of parts you can rearrange, and two ready-made viewers. We added it because embedding was the goal. `apps/web` is the demo.

We kept reading and drawing separate so a Node script or a Vue app can use the reader without React.

## What changes for MCAP

MCAP is a timestamped message log, not a list of episodes, so it shares almost no reading code with RLDS.

- One reading package per format. RLDS is `@robopeek/rlds`; MCAP will be added later as `@robopeek/mcap`. One shared package with tree-shaking would still make RLDS users install MCAP's decompressors, since tree-shaking trims bundles, not installs.
- One React package. Only three small files (about 170 of 1,850 lines) touch RLDS directly. They move to `@robopeek/react/rlds` as `RldsShardViewer`, `RldsEpisodeViewer`, `useRldsStream` and `useRldsEpisode`. The player and everything else stay shared. MCAP gets `@robopeek/react/mcap`.
- The player gets its own input type. Each format converts its own type into it. If MCAP doesn't fit, or a shape changes later, the change stays inside that format's packages.
- No shared `@robopeek/core` yet. It would be empty today. We'll shape it around MCAP when that arrives.

## Open question

The player counts in steps. MCAP topics tick at different rates, so it may need to count in time instead. We'll decide after reading one real MCAP file. A time-based player would also replace the guessed 10 fps default.

## Not built yet

Decoding in Web Workers, a saved episode index, caching, and the thesis's measurements (bytes fetched, time to first frame, memory, parity with the Python loader). GZIP shards fail without saying why.

## Next

Done: `core` renamed to `@robopeek/rlds`.

Now, before publishing: move the RLDS hooks and viewers to `@robopeek/react/rlds`, and update the docs and demo.

When MCAP starts: read one MCAP file, settle steps vs. time, then add `@robopeek/core`, `@robopeek/mcap` and `@robopeek/react/mcap`.
