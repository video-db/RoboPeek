<p align="center">
  <img src="https://raw.githubusercontent.com/video-db/RoboPeek/main/assets/mascot.png" alt="RoboPeek" width="120" />
</p>

<p align="center">
  Maintained by
  <a href="https://videodb.io">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/video-db/RoboPeek/main/assets/videodb-logo-dark.png" />
      <img src="https://raw.githubusercontent.com/video-db/RoboPeek/main/assets/videodb-logo.png" alt="VideoDB" height="18" align="center" />
    </picture>
  </a>
</p>

# @videodb/robopeek-rlds

Read RLDS robot-learning episodes straight from TFRecord shards, in the browser or in Node. You don't need Python, TensorFlow or a backend.

[![npm](https://img.shields.io/npm/v/@videodb/robopeek-rlds?style=flat-square)](https://www.npmjs.com/package/@videodb/robopeek-rlds)

Part of [RoboPeek](https://github.com/video-db/RoboPeek), which previews robotics datasets on the web. This package is the RLDS reader. It has no dependencies and no UI. For ready-made React viewers, install [`@videodb/robopeek-react`](https://www.npmjs.com/package/@videodb/robopeek-react) next to it and import from `@videodb/robopeek-react/rlds` (see [Using it with React](#using-it-with-react)).

- **Stream a whole shard**: episodes arrive one by one while the file downloads.
- **Open one episode by number** without downloading the rest of the shard (HTTP Range requests).
- **Get plain data back**: camera frames, actions and states as typed arrays, language instructions, episode metadata, and every raw feature.
- **Works on any RLDS / TFDS dataset**, such as Open X-Embodiment. Nothing is keyed to one dataset's field names.

## Contents

- [Install](#install)
- [Quick start](#quick-start)
- [Concepts](#concepts)
- [Reading a whole shard: `streamEpisodes`](#reading-a-whole-shard-streamepisodes)
- [Reading one episode: `ShardIndex`](#reading-one-episode-shardindex)
- [Feature specs (`features.json`)](#feature-specs-featuresjson)
- [The `Episode` object](#the-episode-object)
- [Helpers](#helpers)
- [Pixels for raw images](#pixels-for-raw-images)
- [Low-level API](#low-level-api)
- [Recipes](#recipes)
- [Using it with React](#using-it-with-react)
- [Errors and limits](#errors-and-limits)
- [API index](#api-index)

## Install

```sh
npm install @videodb/robopeek-rlds
# or: pnpm add @videodb/robopeek-rlds / yarn add @videodb/robopeek-rlds
```

ESM only. Runs in modern browsers and in Node 20+ (it uses `fetch`, `Blob` and web streams).

## Quick start

```ts
import { streamEpisodes, ShardIndex, loadFeatureSpecs, episodeTitle, vectorAt } from '@videodb/robopeek-rlds'

const url = 'https://huggingface.co/datasets/<org>/<dataset>/resolve/main/<split>.tfrecord-00000-of-00128'
const specs = await loadFeatureSpecs(url) // optional: the features.json next to the shard

// 1. Every episode, as the shard downloads
for await (const ep of streamEpisodes(url, { specs })) {
  console.log(ep.index, ep.length, episodeTitle(ep), Object.keys(ep.images))
}

// 2. Just episode 40, without downloading the rest
const shard = await ShardIndex.open(url, { specs })
const ep = await shard.episode(40)
const firstAction = vectorAt(ep!.vectors.action, 0) // Float32Array of the action at step 0
```

## Concepts

| Term | Meaning |
|---|---|
| **Shard** | One TFRecord file (`*.tfrecord-00000-of-00128`). A dataset is split into many shards; each holds many episodes. |
| **Episode** | One recorded demonstration. In RLDS/TFDS each episode is one record in the shard. |
| **Step** | One timestep of an episode: camera frames, the action taken, the robot state, flags like `is_first`. |
| **Source** | Where to read from: a URL (`string` or `URL`) or a `Blob` / `File` (for example a file the user picked). |
| **Feature specs** | Optional tensor shapes and dtypes from the dataset's `features.json`. They turn flat arrays back into images and matrices. |

```ts
type Source = Blob | string | URL
```

## Reading a whole shard: `streamEpisodes`

```ts
streamEpisodes(src: Source, opts?: ReadOptions): AsyncGenerator<Episode>

type ReadOptions = {
  signal?: AbortSignal                      // stop reading
  onProgress?: (p: Progress) => void        // bytes read so far
  specs?: FeatureSpecs                      // from loadFeatureSpecs / parseFeatureSpecs
}
type Progress = { loaded: number; total?: number } // total is undefined when the server sends no length
```

Episodes are yielded as soon as their bytes arrive, so you can show the first one while the rest of the shard is still downloading.

```ts
const ac = new AbortController()

for await (const ep of streamEpisodes(fileOrUrl, {
  signal: ac.signal,
  onProgress: ({ loaded, total }) => console.log(`${loaded} / ${total ?? '?'} bytes`),
})) {
  render(ep)
}

// Later, for example when the user picks another file:
ac.abort()
```

Use it when you want every episode in the shard, such as for an episode list. For a single episode, `ShardIndex` is cheaper.

## Reading one episode: `ShardIndex`

```ts
const shard = await ShardIndex.open(src, { signal?, specs? })
const ep = await shard.episode(n, { signal?, onProgress? }) // Episode | undefined
```

- `episode(n)` resolves `undefined` when the shard has fewer than `n + 1` episodes.
- Episode numbers start at 0, in file order.
- `shard.entries.length` is the number of episodes found so far. `shard.complete` turns `true` once the end of the file has been reached, at which point `entries.length` is the total.
- Calls run one at a time, in order, so you can call `episode()` freely from UI events.

**How it saves bytes.** TFRecord has no table of contents, so the first time you ask for episode 40 the reader streams past episodes 0–39, noting where each starts but not decoding them, and stops at 40. After that, any episode it has already passed is fetched with one exact Range request. Moving between nearby episodes is cheap; jumping far ahead reads through the gap once.

**Requirements for URLs.** The server must support HTTP Range requests (Hugging Face, S3, GCS and most CDNs do) and allow cross-origin requests when used from a browser. Without Range support, `open()` throws and explains why; use `streamEpisodes` instead. Local `Blob`s and `File`s always work.

```ts
// Show episode n, with Next and Previous buttons
const shard = await ShardIndex.open(url)
let n = 0
async function show(i: number) {
  const ep = await shard.episode(i)
  if (!ep) return // past the end
  n = i
  render(ep)
}
show(0)
nextButton.onclick = () => show(n + 1)
prevButton.onclick = () => n > 0 && show(n - 1)
```

### Custom storage: `RangeReader`

`ShardIndex.open` picks a reader for you. To read from somewhere else (authenticated storage, a cache, IndexedDB), implement `RangeReader` and pass it to the constructor:

```ts
type RangeReader = {
  size: number | undefined
  read(offset: number, length: number, signal?: AbortSignal): Promise<Uint8Array>
  stream(offset: number, signal?: AbortSignal): Promise<ReadableStream<Uint8Array>>
}

const shard = new ShardIndex(myReader, specs)
```

The built-in readers are exported too: `blobReader(blob)` and `urlReader(url, signal?)`. `urlReader` checks Range support once and remembers the final URL after redirects, so later reads skip the redirect.

## Feature specs (`features.json`)

TFRecord stores every tensor as a flat list of numbers. A 128×128 depth image arrives as 16,384 floats per step, and a 3×3 rotation matrix as 9. TFDS datasets ship a `features.json` next to their shards that records the real shapes. Pass it in, and the reader restores them:

- Numeric tensors of at least 32×32, with 1, 3 or 4 channels (or none), become images (`kind: 'raw'`), such as float depth maps.
- Smaller tensors keep their shape (`[3, 3]`) on the vector track.

```ts
const specs = await loadFeatureSpecs(shardUrl)                   // fetches features.json from the shard's folder; undefined if missing
const fromFile = parseFeatureSpecs(JSON.parse(await file.text())) // from a features.json you already have
```

```ts
loadFeatureSpecs(shardUrl: string | URL, signal?: AbortSignal): Promise<FeatureSpecs | undefined>
parseFeatureSpecs(json: unknown): FeatureSpecs

type FeatureSpecs = Map<string, FeatureSpec> // keyed like the features, e.g. 'steps/observation/depth'
type FeatureSpec = { type: string; shape: number[]; dtype: string; description?: string }
```

Specs are optional. Without them, encoded camera images (PNG/JPEG/WebP) still work; only numeric images and tensor shapes are lost.

## The `Episode` object

```ts
type Episode = {
  index: number                          // position in the shard, from 0
  length: number                         // number of steps
  byteSize: number                       // size of the serialized episode
  images: Record<string, ImageTrack>     // cameras, keyed like 'observation/image'
  vectors: Record<string, VectorTrack>   // numbers per step: 'action', 'observation/state', 'reward', …
  text: Record<string, string[]>         // text per step: 'language_instruction', …
  metadata: Record<string, Feature>      // episode-level values: 'episode_metadata/file_path', …
  features: Map<string, Feature>         // every decoded key, untouched
}
```

Step keys drop the `steps/` prefix (`steps/action` → `action`). Metadata keys keep their full name.

### How keys are sorted

The reader looks at each feature, not at its name:

| Feature | Goes to |
|---|---|
| `steps/*` bytes that start like a PNG, JPEG or WebP file | `images` (`kind: 'encoded'`) |
| `steps/*` numbers whose spec shape is an image (≥ 32×32, 1/3/4 channels) | `images` (`kind: 'raw'`) |
| other `steps/*` numbers | `vectors` |
| `steps/*` bytes that are valid UTF-8 text | `text` |
| everything else (episode metadata, odd-sized features) | `metadata` |

The number of steps comes from the standard RLDS fields (`is_first`, `is_last`, `is_terminal`, `reward`, `discount`). If a key ends up in the wrong place for your dataset, read it from `features`, which holds every key exactly as decoded.

### `ImageTrack`

```ts
type ImageTrack =
  | { kind: 'encoded'; mime: 'image/png' | 'image/jpeg' | 'image/webp'; frames: Uint8Array[] }
  | { kind: 'raw'; shape: [h: number, w: number, c: number]; data: Float32Array | Float64Array }
```

- **`encoded`**: one compressed image per step. `frames[step]` is a complete PNG/JPEG/WebP file, so `new Blob([frames[step]], { type: mime })` gives you something an `<img>` can show.
- **`raw`**: numbers, such as float depth, stored row-major as `[length × h × w × c]`. `rgbaAt(track, step)` turns one frame into RGBA pixels; see [Pixels for raw images](#pixels-for-raw-images).

### `VectorTrack`

```ts
type VectorTrack = {
  shape: number[]                    // per-step shape: [7] for a 7-d action, [3, 3] with specs, [] for scalars with specs
  dim: number                        // numbers per step (product of shape)
  data: Float32Array | Float64Array  // all steps, row-major [length × dim]
}
```

Use `vectorAt(track, step)` to get one step's values. 64-bit integer features are converted to `Float64Array` (exact up to 2^53).

### `Feature`

The raw decoded value, as stored in the `tf.train.Example`:

```ts
type Feature =
  | { kind: 'bytes'; values: Uint8Array[] }
  | { kind: 'float'; values: Float32Array }
  | { kind: 'int64'; values: BigInt64Array } // exact
```

`images`, `text` and `metadata` reuse the arrays in `features`, so nothing is copied.

## Helpers

| Function | Returns | Use it for |
|---|---|---|
| `vectorAt(track, step)` | `Float32Array \| Float64Array` | One step's values from a vector track (a view, not a copy) |
| `episodeTitle(episode)` | `string \| undefined` | A display title: the first non-empty `natural_language_instruction`, then `language_instruction`, then any `*instruction*`, then any text |
| `readText(feature)` | `string[] \| undefined` | Text from a bytes feature; `undefined` if it isn't valid UTF-8 |
| `readNumbers(feature)` | `Float32Array \| Float64Array \| undefined` | Numbers from a float or int64 feature (for exact int64, read `feature.values`) |
| `formatFeature(feature)` | `string` | A short one-line display string for any feature |

```ts
import { readText, readNumbers, formatFeature } from '@videodb/robopeek-rlds'

readText(ep.metadata['episode_metadata/file_path'])?.[0]    // '/data/run_0042.npz'
readNumbers(ep.metadata['episode_metadata/episode_id'])?.[0] // 42
formatFeature(feature) // numbers: '0.1, 0.2, …' (first 16) · text: 'a | b' · other bytes: '2 × binary (1024 B)'
```

## Pixels for raw images

Raw tracks hold numbers, not colours. These helpers turn them into RGBA, with no DOM and no React, so the same code works in a browser, a worker or Node.

| Function | Returns | |
|---|---|---|
| `rawRange(track)` | `[lo, hi]` | The value range a raw track is scaled to. Single-channel tracks (depth) use the track's own finite min/max. Colour tracks assume 0–1 when `hi ≤ 1`, else 0–255. |
| `rgbaAt(track, step, range?)` | `Uint8ClampedArray` | RGBA pixels (`w × h × 4`) for one step. Pass the same `range` for every step so brightness doesn't flicker; it defaults to `rawRange(track)`. Non-finite depth values become black. |
| `frameCount(track)` | `number` | Frames in any image track (`encoded` or `raw`) |

```ts
import { rawRange, rgbaAt } from '@videodb/robopeek-rlds'

const depth = ep.images['observation/depth']
if (depth?.kind === 'raw') {
  const range = rawRange(depth) // once per track
  const [h, w] = depth.shape
  const bmp = await createImageBitmap(new ImageData(rgbaAt(depth, step, range), w, h))
  ctx.drawImage(bmp, 0, 0)
}
```

## Low-level API

You won't need these for normal use. They're the stages `streamEpisodes` is built from, exported for custom pipelines.

| Function | What it does |
|---|---|
| `openSource(src, signal?)` | Opens a URL or Blob as `{ stream, total }` |
| `readRecords(stream, onBytes?)` | Yields each TFRecord record's bytes as soon as they arrive |
| `decodeExample(bytes)` | Decodes one record (`tf.train.Example`) into `Map<string, Feature>` |
| `toEpisode(features, index, byteSize, specs?)` | Sorts decoded features into an `Episode` |

```ts
import { openSource, readRecords, decodeExample, toEpisode } from '@videodb/robopeek-rlds'

const { stream } = await openSource(url)
let i = 0
for await (const record of readRecords(stream)) {
  const features = decodeExample(record)
  console.log([...features.keys()]) // every key in this episode
  const ep = toEpisode(features, i++, record.length)
}
```

## Recipes

### Node: read a local file

```ts
import { openAsBlob } from 'node:fs'
import { streamEpisodes, episodeTitle } from '@videodb/robopeek-rlds'

const blob = await openAsBlob('./bridge.tfrecord-00000-of-01024')
for await (const ep of streamEpisodes(blob)) {
  console.log(ep.index, ep.length, episodeTitle(ep))
}
```

### Browser: a file the user picked

```ts
input.onchange = async () => {
  const file = input.files![0]
  const shard = await ShardIndex.open(file) // local files never need Range support
  render(await shard.episode(0))
}
```

### Show a camera frame in an `<img>`

```ts
const cam = ep.images['observation/image']
if (cam?.kind === 'encoded') {
  img.src = URL.createObjectURL(new Blob([cam.frames[step]], { type: cam.mime }))
}
```

### Collect every instruction in a shard

```ts
const instructions = new Set<string>()
for await (const ep of streamEpisodes(url)) {
  const title = episodeTitle(ep)
  if (title) instructions.add(title)
}
```

### Build your own player

Combine `frames[step]`, `rgbaAt(track, step)`, `vectorAt(track, step)` and `text[key][step]` with your own clock. Or use [`@videodb/robopeek-react`](https://www.npmjs.com/package/@videodb/robopeek-react), which has all of this built in.

## Using it with React

This package has no React code. React viewers for RLDS live in `@videodb/robopeek-react/rlds`, which imports this package as an **optional peer dependency**. Install both:

```sh
npm install @videodb/robopeek-react @videodb/robopeek-rlds
```

```tsx
import { ShardViewer } from '@videodb/robopeek-react/rlds'
import { streamEpisodes, type Episode } from '@videodb/robopeek-rlds' // the reader API comes from here, not from the React package
import '@videodb/robopeek-react/styles.css'

<ShardViewer source={url} />
```

- `@videodb/robopeek-react` doesn't install or re-export this package. Import reader functions and types (`Episode`, `Source`, `vectorAt`, …) from `@videodb/robopeek-rlds` directly.
- Importing `@videodb/robopeek-react/rlds` without this package installed fails with a message naming `@videodb/robopeek-rlds`.
- Installing this package never installs the MCAP reader or its decoders.

See [`@videodb/robopeek-react`](https://www.npmjs.com/package/@videodb/robopeek-react) for the viewers, the player and the hooks.

## Errors and limits

| Situation | What happens |
|---|---|
| Server doesn't support Range | `ShardIndex.open` throws an explanation; `streamEpisodes` still works |
| Server sends no CORS headers | The browser blocks the request (a `TypeError: Failed to fetch`). The public Open X-Embodiment bucket on `storage.googleapis.com/gresearch` is one; download the file, or host it somewhere that allows CORS. Node is not affected. |
| GZIP-compressed TFRecords | Not supported yet |
| Record checksums (CRC) | Not verified |
| Frame rate | RLDS doesn't record one; choose a playback rate yourself |
| Text stored as numbers (Language Table) | Shows up as a vector, not text |

Tested on CognitiveDrone, RT-1 (fractal), Bridge, TACO Play, Berkeley UR5, Language Table, Austin BUDS, NYU Door Opening, Stanford Hydra and DROID.

## API index

| Export | Kind |
|---|---|
| `streamEpisodes` | Read every episode, as the shard downloads |
| `ShardIndex` | Read one episode by number |
| `loadFeatureSpecs`, `parseFeatureSpecs` | Load tensor shapes from `features.json` |
| `vectorAt`, `episodeTitle`, `readText`, `readNumbers`, `formatFeature` | Helpers |
| `rawRange`, `rgbaAt`, `frameCount` | Pixels for raw images |
| `blobReader`, `urlReader` | Built-in `RangeReader`s |
| `openSource`, `readRecords`, `decodeExample`, `toEpisode` | Low-level stages |
| `Episode`, `ImageTrack`, `VectorTrack`, `Feature`, `FeatureSpec`, `FeatureSpecs`, `Source`, `Progress`, `ReadOptions`, `RangeReader`, `RecordEntry` | Types |

## Related

- [`@videodb/robopeek-react`](https://www.npmjs.com/package/@videodb/robopeek-react): viewers, a player and hooks. Install it next to this package and import from `@videodb/robopeek-react/rlds`.
- [`@videodb/robopeek-mcap`](https://www.npmjs.com/package/@videodb/robopeek-mcap): the MCAP reader.
- [RoboPeek on GitHub](https://github.com/video-db/RoboPeek): source, issues, and the roadmap.
- [Changelog](https://github.com/video-db/RoboPeek/blob/main/packages/rlds/CHANGELOG.md)

## License

MIT. See [LICENSE](https://github.com/video-db/RoboPeek/blob/main/LICENSE).

---

<p align="center">
  Maintained by
  <a href="https://videodb.io">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/video-db/RoboPeek/main/assets/videodb-logo-dark.png" />
      <img src="https://raw.githubusercontent.com/video-db/RoboPeek/main/assets/videodb-logo.png" alt="VideoDB" height="18" align="center" />
    </picture>
  </a>
</p>
