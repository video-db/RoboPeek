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

Decided when MCAP was built (2026-10-09):

- Readers stay separate: `@videodb/robopeek-rlds` and `@videodb/robopeek-mcap`. No `@videodb/robopeek-core`.
- One React package, `@videodb/robopeek-react`. Its root entry is format-free: the player reads a `Timeline` type defined there. `/rlds` and `/mcap` hold each format's adapter, hooks and viewers. The readers are optional peer dependencies, so an app installs only the format it uses.
- The boundary is enforced, not just documented: CI checks the built entries' imports, and crossing it throws a message that says what to install or import instead.
- The player counts in the timeline's unit: steps for RLDS (speed in fps), seconds for MCAP (real timestamps; speed as × real time).
- One MCAP file is one episode. Splitting a file into episodes is deferred.

## Not built yet

Decoding in Web Workers, a saved episode index, caching, and the thesis's measurements (bytes fetched, time to first frame, memory, parity with the Python loader). GZIP shards fail without saying why.

## Next

Done: `core` renamed to `@videodb/robopeek-rlds`.

MCAP: built as `@videodb/robopeek-mcap` + `@videodb/robopeek-react/mcap` (see above). Packages version independently; React declares reader peer ranges by the APIs it uses. Next release: mcap 0.1.0 (first), rlds 0.2.0 (pixel helpers), react 0.2.0 (breaking for RLDS imports).
