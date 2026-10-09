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

- Two packages per format, nothing shared. `@videodb/robopeek-mcap` (reader) and `@videodb/robopeek-mcap-react` (UI) sit beside the RLDS pair. No `@videodb/robopeek-core`, and no `robopeek-react/mcap` subpath: an MCAP user installs nothing of RLDS's, and the reverse. The cost is a second copy of the player shell (~600 lines), which is acceptable because the two players count differently.
- The MCAP player counts in time. Topics tick at different rates (30 Hz cameras, 500 Hz joints), and every message has a real timestamp, so there is no fps setting. The RLDS player keeps counting in steps.
- One file is one episode. Splitting a file into episodes is deferred.
- The two React packages share the `rp-*` classes, `--rp-*` tokens and `@layer robopeek`, so one theme covers both.

## Not built yet

Decoding in Web Workers, a saved episode index, caching, and the thesis's measurements (bytes fetched, time to first frame, memory, parity with the Python loader). GZIP shards fail without saying why.

## Next

Done: `core` renamed to `@videodb/robopeek-rlds`.

MCAP: built as `@videodb/robopeek-mcap` + `@videodb/robopeek-mcap-react` (see above); first release pending.
