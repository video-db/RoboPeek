# Thesis review

## The plan

RLDS datasets ship as large shard files, each holding many episodes. RoboPeek ([THESIS.md](THESIS.md)) lets you preview one episode in the browser without downloading the whole shard. The thesis asked for a framework-independent library plus a small demo app, a UI package only if embedding needed one, and MCAP as the next format.

## What we built, and why

We split the work into a reader and a UI, because they serve different people. A Node script, a Python bridge or a Vue app needs to read episodes but has no use for React. A React app needs both.

`@videodb/robopeek-rlds` is the reader. It turns an RLDS shard (or one episode of it) into camera frames, numeric tracks, text and metadata, in the browser, with no backend. It started life as `core`. We renamed it before publishing because nothing in it is generic: every line is about RLDS, and calling it `core` would have implied otherwise once a second format arrives. All ten public datasets we tried load.

`@videodb/robopeek-react` is the UI: data hooks, small components, a player made of rearrangeable parts, and two ready-made viewers. The thesis said to add a UI package only if embedding needed one. We added it because embedding is the point: datasets.bot and other apps should be able to drop the viewer in and make it look like their own without forking it. That's also why it's built in layers. Some teams will take the whole viewer, some the player with their own layout, and some only the hooks under their own design system.

Both publish under VideoDB's existing npm org as `@videodb/robopeek-rlds` and `@videodb/robopeek-react`. npm allows one slash per name, so `@videodb/robopeek/rlds` isn't possible, and a new `@robopeek` org would have been one more account to manage.

`apps/web` is the demo and test harness. We kept it to thin pages over the ready-made viewers, so anything the demo needs has to exist in the library first.

## What changes for MCAP

MCAP is a timestamped message log, not a list of episodes, so it shares almost no reading code with RLDS.

- One reading package per format. RLDS is `@videodb/robopeek-rlds`; MCAP will be added later as `@videodb/robopeek-mcap`. One shared package with tree-shaking would still make RLDS users install MCAP's decompressors, since tree-shaking trims bundles, not installs.
- One React package. Only three small files (about 170 of 1,850 lines) touch RLDS directly. They move to `@videodb/robopeek-react/rlds` as `RldsShardViewer`, `RldsEpisodeViewer`, `useRldsStream` and `useRldsEpisode`. The player and everything else stay shared. MCAP gets `@videodb/robopeek-react/mcap`.
- The player gets its own input type. Each format converts its own type into it. If MCAP doesn't fit, or a shape changes later, the change stays inside that format's packages.
- No shared `@videodb/robopeek-core` yet. It would be empty today. We'll shape it around MCAP when that arrives.

## Open question

The player counts in steps. MCAP topics tick at different rates, so it may need to count in time instead. We'll decide after reading one real MCAP file. A time-based player would also replace the guessed 10 fps default.

## Not built yet

Decoding in Web Workers, a saved episode index, caching, and the thesis's measurements (bytes fetched, time to first frame, memory, parity with the Python loader). GZIP shards fail without saying why.

## Next

Done: `core` renamed to `@videodb/robopeek-rlds`.

Now, before publishing: move the RLDS hooks and viewers to `@videodb/robopeek-react/rlds`, and update the docs and demo.

When MCAP starts: read one MCAP file, settle steps vs. time, then add `@videodb/robopeek-core`, `@videodb/robopeek-mcap` and `@videodb/robopeek-react/mcap`.
