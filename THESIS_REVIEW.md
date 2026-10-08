# Thesis review

## The plan

RLDS datasets ship as large shard files, each holding many episodes. RoboPeek ([THESIS.md](THESIS.md)) lets you preview one episode in the browser without downloading the whole shard. The thesis asked for a framework-independent library plus a small demo app, a UI package only if embedding needed one, and MCAP as the next format.

## What we built

`@robopeek/rlds` reads RLDS. It started life as `core` and was renamed before publishing, because everything in it is RLDS-specific. It splits a TFRecord file into records, decodes each `tf.train.Example`, and groups the keys into an episode (camera frames, numeric tracks, text, metadata). All ten public datasets we tried load.

Why it's built this way:

- It has its own small protobuf decoder instead of TensorFlow or a protobuf library. The whole point is to run in a browser with no backend, and those dependencies are far heavier than the one message type we need.
- To fetch one episode, it reads straight through the file and skips the earlier episodes without decoding them. TFRecord has no index, so we have to find the episode somehow. Jumping between record headers with range requests sounds cheaper, but each request costs about 600 ms on Hugging Face's CDN, while streaming past a typical 1.4 MB episode takes about 90 ms.
- It reads the dataset's `features.json` when one exists. The shard itself doesn't store tensor shapes, so without it a depth image arrives as a flat list of 30,000 numbers.
- It never guesses the playback rate. RLDS doesn't record one, so fps is left to the caller.

`@robopeek/react` is the UI: data hooks, small components, a player made of parts, and two ready-made viewers. The thesis said to add a UI package only if embedding needed one. We added it because embedding is the goal: datasets.bot and others should be able to drop the viewer in and make it look like their own product without forking it.

Why it's built this way:

- It comes in layers (hooks, small components, player parts, full viewers), so a team can use as much or as little as it wants: the whole viewer, the player with its own layout, or just the hooks under its own design system.
- The player is made of parts that share state, and each part is also exposed as a hook. Changing one button doesn't mean rebuilding the player.
- All styling goes through CSS variables inside a CSS layer, so the host app's styles, Tailwind included, win without any hacks. The defaults follow the VideoDB design system.

`apps/web` is the demo and test harness. It's two thin pages over the ready-made viewers, which keeps it honest: if the demo needs something, the library has to provide it.

Reading and drawing live in separate packages so a Node script or a Vue app can use the reader without pulling in React.

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
