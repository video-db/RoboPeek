# RoboPeek

> Preview one robot-learning episode from its source, without downloading the entire dataset.

**Repository:** [video-db/RoboPeek](https://github.com/video-db/RoboPeek). The name emphasizes lightweight robotics-data previews and leaves room for dataset overviews, episode playback, and additional format adapters.

## What we're solving

Datasets.bot already streams previews when source media is directly accessible as MP4. For episodes stored inside supported RLDS/TFDS shards, previewing requires locating the episode, retrieving its serialized data, and decoding its observations into something a browser can display.

RoboPeek is an open-source, embeddable access library for that missing step. An application supplies a source reference and episode identifier, optionally a time interval and camera selection. The library resolves the episode's storage location, fetches the minimum practical source ranges, and progressively renders a preview on the user's machine.

The main deliverable is the library. A small link-and-preview web application is its test harness and integration example, not a new dataset-management product. Datasets.bot is the first consumer; other applications should be able to use it independently.

### Relationship to the existing launch

The existing project at `../../launches/datasets.bot/datasets-bot` already provides the dataset catalog, browsing, search, and collections. Its current `apps/web/src/chat/Episodes.tsx` also provides matched-episode cards, metadata, selection/export controls, and source-video playback through `watch_url` with time fragments. Where playback is unavailable or fails, it falls back to dataset sample frames rather than decoded episode observations.

RoboPeek should supply the missing source-native preview capability to those existing surfaces, not build another discovery product. It can later expose dataset descriptions, episode enumeration, and synchronized camera/signal views for embedding, while datasets.bot retains ownership of catalog search and the researcher workflow.

## The important constraint

RLDS defines an episode/step model, not one universal on-disk encoding. Initial support must target a documented TFDS/TFRecord serialization profile rather than claim to open every RLDS dataset.

HTTP byte ranges only help when we know where an episode lives and the storage layout permits independent decoding. TFRecord record framing does not itself provide a remote episode lookup index. A sidecar index may therefore be necessary, mapping stable episode identifiers to source shards, record offsets, lengths, and schema information. Generate it once during ingestion or through a standalone indexing command; reuse it for subsequent previews.

Uncompressed TFRecord shards can support record-level range reads. Whole-file GZIP compression generally prevents arbitrary record-level seeking without additional indexing or repackaging. If an entire episode is serialized into one record, a short preview may still require fetching and decoding that complete record. Frame-level seeking must not be promised unless the source representation supports it.

The promise is **avoid unrelated episodes where the source permits it**, not “fetch only the exact video frames from any URL.” Unsupported layouts should produce an explicit explanation, with larger downloads allowed only through an opt-in fallback.

## Initial design

1. **Resolve and index.** Resolve an immutable source revision and episode ID to a supported shard, byte range, and schema. Reuse existing metadata where sufficient; otherwise consume a generated sidecar index.
2. **Fetch selectively.** Use HTTP Range requests, cancellation, request deduplication, and a bounded local cache. Detect servers that ignore range requests; require usable CORS and browser-compatible authorization.
3. **Decode locally.** Parse records and decode selected camera observations in Web Workers. Use WASM where an existing decoder warrants it, rather than assuming WASM makes every storage layout seekable.
4. **Present progressively.** Expose decoded frames and associated timing through a small API. Timestamp availability and synchronization depend on the dataset profile; embedded image sequences need a playback scheduler, not necessarily MP4 conversion.

Use two public entry points: a framework-independent core library and a demo application. Add a UI component package only if embedding demand justifies it. An offline indexing tool is compatible with browser-side playback; a permanent data-processing backend is not required for supported indexed sources.

## Scope and value

Start with one RLDS/TFDS profile used by datasets.bot, one RGB camera, episode lookup, range retrieval, local decoding, and preview playback. Support public sources and suitable signed URLs first. Add interval seeking and additional cameras only after measuring the source layout's limits.

MCAP comes next, reusing its existing indexed-reading ecosystem. MCAP browser readers already exist, so the contribution there is a consistent episode-oriented API and application integration. MCAP messages do not inherently define training episodes; an adapter needs explicit episode boundaries and topic mappings.

Exclude semantic search, training validation, universal format conversion, and dataset curation. Those belong to consuming applications.

## Viability test

Compare a matched-episode preview against downloading its containing shard. Measure bytes transferred, time to first frame, random-seek latency, peak browser memory, and repeat-preview cache behavior. Verify decoded observations against the reference Python loader.

Proceed if a representative datasets.bot source permits substantially cheaper episode retrieval with a reusable index and acceptable browser decoding costs. If its compression or serialization forces full-shard reads, change the distribution layout or narrow support rather than disguising a full download as streaming.

This is worthwhile as a focused open-source infrastructure utility. Its practical value is an embeddable RLDS episode-access path, exercised by a real product—not an unverified claim that robotics visualization or MCAP remote reading is unsolved.
