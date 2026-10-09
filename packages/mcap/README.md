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

# @videodb/robopeek-mcap

Read MCAP robot recordings in the browser or in Node: ROS 1 and ROS 2 bags, Foxglove recordings, FiftyOne exports. You get time-aligned camera, signal and text tracks back. You don't need ROS, Python or a backend.

[![npm](https://img.shields.io/npm/v/@videodb/robopeek-mcap?style=flat-square)](https://www.npmjs.com/package/@videodb/robopeek-mcap)

Part of [RoboPeek](https://github.com/video-db/RoboPeek), which previews robotics datasets on the web. This package is the MCAP reader. It has no UI and no framework. For ready-made React viewers, install [`@videodb/robopeek-react`](https://www.npmjs.com/package/@videodb/robopeek-react) next to it and import from `@videodb/robopeek-react/mcap`.

- **Plays while it downloads**: topics and length come from the file's summary before the first message arrives. Tracks then fill in as the file streams.
- **Real time**: every message keeps its timestamp. Cameras at 30 Hz and joints at 500 Hz line up without resampling.
- **Large files stay within memory**: frame bytes are capped, and frames released under the cap are fetched back with HTTP Range requests when needed.
- **Decodes what robots record**: ROS 1, ROS 2 (CDR), protobuf and JSON messages. Chunks can be zstd- or lz4-compressed. Images can be JPEG/PNG/WebP, raw (`rgb8`, `mono16`, `32FC1`, …) or H.264 video, plus 16-bit depth PNGs.
- **Nothing keyed to one dataset**: cameras, charts and text are recognised from schemas and message shapes, not topic names.

## Contents

- [Install](#install)
- [Quick start](#quick-start)
- [Concepts](#concepts)
- [Opening a file: `openMcap`](#opening-a-file-openmcap)
- [Loading: `file.load`](#loading-fileload)
- [The `Recording` object](#the-recording-object)
- [How topics are classified](#how-topics-are-classified)
- [Time](#time)
- [Memory budget and Range refetch](#memory-budget-and-range-refetch)
- [Drawing frames](#drawing-frames)
- [Message encodings and compression](#message-encodings-and-compression)
- [Low-level API](#low-level-api)
- [Recipes](#recipes)
- [Using it with React](#using-it-with-react)
- [Errors and limits](#errors-and-limits)
- [API index](#api-index)

## Install

```sh
npm install @videodb/robopeek-mcap
# or: pnpm add @videodb/robopeek-mcap / yarn add @videodb/robopeek-mcap
```

ESM only. Runs in modern browsers and in Node 20+ (it uses `fetch`, `Blob` and web streams). Video decoding needs WebCodecs, so it works in browsers only. Everything else works in both.

Dependencies, all plain JavaScript (no WASM for your bundler to configure):

| Package | Used for |
|---|---|
| `@mcap/core` | MCAP records, summary and index |
| `fzstd`, `lz4js` | Chunk decompression |
| `@foxglove/rosmsg`, `@foxglove/rosmsg2-serialization`, `@foxglove/rosmsg-serialization` | ROS 2 (CDR) and ROS 1 messages |
| `protobufjs` | Protobuf messages (Foxglove schemas, FiftyOne exports) |

These are installed only by apps that install this package. An RLDS-only app never gets them.

## Quick start

```ts
import { openMcap, indexAt, vectorAt } from '@videodb/robopeek-mcap'

const file = await openMcap('https://huggingface.co/datasets/<org>/<dataset>/resolve/main/episode.mcap') // or a File / Blob
const rec = file.recording

// Known from the summary already, before any message is read:
console.log(file.indexed, [...rec.topics.values()].map((t) => `${t.topic} (${t.schema}, ${t.count})`))

rec.subscribe(() => console.log(`${rec.duration.toFixed(1)} s loaded`)) // fires as data arrives
await file.load({ onProgress: ({ loaded, total }) => console.log(loaded, total) })

const joints = rec.vectors['/joint_states/position']
const i = indexAt(joints.times, 2.5)                // the sample shown at t = 2.5 s
console.log(joints.names, vectorAt(joints, i))      // ['arm_l_joint1', …] [0.11, 0.11, …]
console.log(rec.text['/instruction']?.values[0])    // 'pick up the cup'
console.log(Object.keys(rec.images))                // ['/camera/color/compressed', …]
```

## Concepts

| Term | Meaning |
|---|---|
| **MCAP** | A log of timestamped messages, grouped into compressed chunks. An optional **summary** at the end lists schemas, channels, message counts and a chunk index. |
| **Topic / channel** | A named message stream (`/joint_states`) with a schema (`sensor_msgs/msg/JointState`) and an encoding (`cdr`). |
| **Recording** | What this package builds from one file: tracks keyed by topic, with times in seconds. One file is one episode. |
| **Track** | One stream ready to show: an image track (a camera), a vector track (a chart), or a text track. |
| **Origin** | The log time treated as t = 0. See [Time](#time). |
| **Source** | A URL (`string` / `URL`) or a `Blob` / `File`. |

```ts
type Source = Blob | string | URL
type Progress = { loaded: number; total?: number }
```

## Opening a file: `openMcap`

```ts
openMcap(src: Source, opts?: OpenOptions): Promise<McapFile>

type OpenOptions = {
  signal?: AbortSignal
  /** Frame bytes kept in memory (default 512 MiB). See "Memory budget". */
  maxFrameBytes?: number
}

type McapFile = {
  name: string                // file name, or the URL
  size: number | undefined    // bytes, when known
  indexed: boolean            // has a summary index AND Range access (see below)
  recording: Recording        // fills in during load()
  load(opts?: LoadOptions): Promise<void>
}
```

`openMcap` reads only the end of the file. When the file has a summary and the source allows random access, this takes a few small requests: 4 requests and 520 KB for a 1.3 GB file on Hugging Face. After that you have:

- `recording.topics`: every topic with its schema, encoding and message count, and its kind when the schema name decides it.
- `recording.summaryEnd`: the last log time, so a timeline can show the full length straight away.
- `file.indexed === true`: frames released under the memory budget can be fetched back.

`indexed` is `false` when the server ignores Range requests, or the file has no summary or chunk index (for example a recording that was cut off). Everything still loads; topics then appear as their records stream in, and frames over the budget are dropped instead of released.

## Loading: `file.load`

```ts
file.load(opts?: LoadOptions): Promise<void>

type LoadOptions = {
  signal?: AbortSignal
  onProgress?: (p: Progress) => void
}
```

`load` streams the whole file in **one** request and decodes messages as bytes arrive. One long request beats many small ones on high-latency hosts; Hugging Face spends about 0.5 s per request. The recording calls its subscribers after each network chunk, so a UI can play the start of a file while the rest downloads.

- Abort with `signal`. The promise then rejects with an `AbortError` (URLs) or resolves early (Blobs).
- `onProgress` reports bytes read. `total` is `undefined` when the server sends no length.
- Truncated files load up to the last complete record.

```ts
const ac = new AbortController()
const file = await openMcap(url, { signal: ac.signal })
const unsubscribe = file.recording.subscribe(() => draw(file.recording))
file.load({ signal: ac.signal }).finally(unsubscribe)
// later: ac.abort()
```

`readMcap(src, opts)` opens and loads in one call and resolves to the `Recording`. It's handy for scripts and tests.

## The `Recording` object

The recording fills in **in place** while loading. Read its fields after `subscribe` fires; `version` changes on every update.

```ts
class Recording {
  readonly topics: Map<string, TopicInfo>          // every topic, in file order
  readonly images: Record<string, ImageTrack>      // cameras, keyed by topic
  readonly vectors: Record<string, VectorTrack>    // numeric signals, keyed by topic or topic/field
  readonly text: Record<string, TextTrack>         // short text, keyed by topic
  readonly metadata: Record<string, string>        // MCAP metadata records, header fields, long text topics

  origin: bigint | undefined     // log time (ns) of t = 0
  duration: number               // last message time loaded, in seconds
  summaryEnd: bigint | undefined // last log time per the summary
  get length(): number           // the timeline length: summary end when known, else duration
  version: number                // bumps on every change
  frameBytes: number             // frame bytes currently in memory
  framesLost: boolean            // frames were dropped and can't be fetched back
  get refetchable(): boolean     // released frames can be fetched again (indexed file)

  subscribe(fn: () => void): () => void   // returns unsubscribe
  frame(topic: string, i: number): Frame | undefined   // frame bytes, marking them recently used
  ensure(topics: string[], t0: number, t1: number, signal?: AbortSignal): Promise<void>
  timeOf(logTime: bigint): number         // seconds from origin
}
```

### `TopicInfo`

```ts
type TopicInfo = {
  topic: string
  schema: string                 // 'sensor_msgs/msg/JointState', 'foxglove.CompressedVideo', …
  encoding: string               // 'cdr', 'protobuf', 'json', 'ros1'
  count: number                  // from the summary when present, else counted while loading
  kind: TopicKind | undefined    // undefined until the first message decides it
  error?: string                 // why it isn't shown (unsupported encoding, decode error)
}
type TopicKind = 'image' | 'video' | 'vector' | 'text' | 'other'
```

### `ImageTrack`

```ts
type ImageTrack = {
  topic: string
  kind: 'image' | 'video'
  times: number[]                    // seconds from origin, ascending
  frames: (Frame | undefined)[]      // undefined: not in memory (released, or not fetched yet)
  keys: boolean[]                    // video: keyframe flags (kept when bytes are released)
  format?: string                    // video codec as recorded, e.g. 'h264'
}

type Frame =
  | { kind: 'encoded'; mime: string; data: Uint8Array }                  // JPEG / PNG / WebP file bytes
  | { kind: 'raw'; width: number; height: number; encoding: string;     // sensor_msgs/Image, foxglove.RawImage
      step: number; bigEndian: boolean; data: Uint8Array }
  | { kind: 'video'; data: Uint8Array }                                  // one H.264 access unit (Annex B)
```

Timestamps are always kept. Only frame bytes are subject to the memory budget. Read frames through `rec.frame(topic, i)`: it marks the frame as recently used, so it's released last.

### `VectorTrack`

```ts
type VectorTrack = {
  topic: string
  times: number[]       // seconds, ascending
  dim: number           // values per sample
  names?: string[]      // per-dimension labels (joint names, x/y/z, field names)
  data: number[]        // row-major [times.length × dim]
}
```

A message with a different width than the first one is padded with `NaN` or cut. `vectorAt(track, i)` returns sample `i` as an array.

### `TextTrack`

```ts
type TextTrack = { topic: string; times: number[]; values: string[] }
```

## How topics are classified

The schema name decides first. ROS 2 `pkg/msg/Name`, ROS 1 `pkg/Name` and `foxglove_msgs/…` names all match.

| Schema | Kind | Becomes |
|---|---|---|
| `sensor_msgs/CompressedImage`, `foxglove.CompressedImage` | `image` | Encoded frames. The bytes decide JPEG/PNG/WebP, because `format` strings like `"rgb8; jpeg compressed bgr8"` vary. |
| `sensor_msgs/Image`, `foxglove.RawImage` | `image` | Raw frames (`width`, `height`, `encoding`, `step`) |
| `foxglove.CompressedVideo` | `video` | H.264 access units with keyframe flags |
| `sensor_msgs/CameraInfo`, `foxglove.CameraCalibration`, `tf2_msgs/TFMessage`, `foxglove.FrameTransform(s)`, `sensor_msgs/PointCloud2`, `foxglove.PointCloud`, `sensor_msgs/LaserScan`, `foxglove.LaserScan`, `visualization_msgs/Marker(Array)`, `foxglove.SceneUpdate`, `foxglove.ImageAnnotations` | `other` | Listed in `topics`, not decoded. Calibration, transforms and 3D data aren't useful as charts. |
| Anything else | decided by the first message | See below |

For other schemas, the first message is decoded and walked:

| Found in the message | Becomes |
|---|---|
| Numbers sharing one parent object (`pose.position` → `x, y, z`) | One vector track named `topic/parent.path`, with the field names as `names` |
| A numeric array of 1–64 values (`position`, `velocity`) | One vector track named `topic/field`. If a sibling string array has the same length (`JointState.name`, `JointTrajectory.joint_names`), it labels the dimensions. |
| Numbers at the root of the message (JSON plots) | One vector track named `topic` |
| A list holding exactly one object (`JointTrajectory.points[0]`) | Walked as that object |
| Only a single string (`std_msgs/String`, task instructions) | A text track. Strings over 500 characters (URDFs, configs) go to `metadata[topic]`. |
| Nothing numeric or textual | Kind `other` |

Skipped while walking: `header`, `stamp` and `timestamp` keys, `{sec, nanosec}` / `{seconds, nanos}` durations, binary `uint8[]` data, arrays over 64 values (covariances, scans), and lists of more than one object.

Real examples:

| Message | Tracks |
|---|---|
| `sensor_msgs/JointState` (25 joints) | `/joint_states/position`, `/velocity`, `/effort`, each `[25]` with joint names |
| `nav_msgs/Odometry` | `/odom/pose.pose.position` `[x,y,z]`, `/odom/pose.pose.orientation` `[x,y,z,w]`, `/odom/twist.twist.linear`, `/odom/twist.twist.angular`. Both covariances (`[36]`) are kept too. |
| `geometry_msgs/Twist` | `/cmd_vel/linear`, `/cmd_vel/angular` |
| `trajectory_msgs/JointTrajectory` | `/…/joint_trajectory/points.positions` labelled with `joint_names` |
| FiftyOne `RobotState` (protobuf) | `/left-arm-joint-pos-state/position` |

## Time

- **Unit.** Seconds from `rec.origin`, as JavaScript numbers. Nanosecond log times convert exactly for recordings up to about 100 days long.
- **Which timestamp.** The message's MCAP `logTime`, which is what MCAP's index uses. Header stamps inside messages are ignored.
- **Origin.** Some recordings hold a few messages stamped very differently from the rest: latched topics (`/tf_static`, `/robot_description`) logged at the time they were published, or clocks counting from boot instead of from 1970. Using the earliest log time would make the timeline decades long. One ROS 2 bag tested here would have claimed 56 years. So the origin is **the earliest log time within 60 s of the median of the first 64 camera/chart messages**. Messages logged before the origin sit at t = 0.
- **Out-of-order messages** are inserted in time order, so every `times` array is sorted.
- **Lookups.** `indexAt(times, t)` returns the last sample at or before `t` (−1 before the first). That's the sample a player shows at time `t`.

## Memory budget and Range refetch

Robot recordings are often several gigabytes, and a browser tab can't hold that much. Frame bytes are capped at `maxFrameBytes` (default 512 MiB); timestamps, signals and text are always kept.

| File | When over the budget |
|---|---|
| **Indexed** (summary + Range access; local files always qualify) | The least recently used frames *outside the playhead's window* are released (`frames[i] = undefined`). `ensure()` reads them back. |
| **Not indexed** | New frames are no longer kept, and `framesLost` turns `true`. Released frames could never come back, so the first part of the file stays complete. |

### `ensure(topics, t0, t1, signal?)`

Brings the frames of `topics` between `t0` and `t1` (seconds) back into memory.

- **Reads only what's needed.** It looks up which chunks overlap the window in the chunk index, then fetches them as **~4 MB pieces of whole chunks**, two in flight, decoding each piece as it lands. The first frames show before the whole window has arrived.
- **Video reaches back to the keyframe** before `t0`, so the decoder can start there.
- **Overlapping calls cost nothing.** Calling it on every playhead move is fine: it skips frames already in memory and ranges already being read, and reads at least 2 s at a time.
- **One window read at a time.** On a slow link the frames needed next don't share bandwidth with the lookahead.
- **Protected while in use.** Frames a window brings in are kept until its read finishes. The latest window (−1 s to the end) is the last to be released.

Size the budget above a few seconds of all camera streams, so the lookahead fits. Refetching can't be faster than the network. On a link slower than the recording's data rate (RoboMIND's six cameras: 7.7 MB/s), released frames won't replay in real time; with the default budget that file never releases any.

## Drawing frames

```ts
import { rawToRGBA, decodePng16, isPng16Gray, VideoTrackDecoder, MissingFramesError } from '@videodb/robopeek-mcap'
```

**Encoded** (`kind: 'encoded'`): file bytes, ready for the browser.

```ts
const bmp = await createImageBitmap(new Blob([frame.data], { type: frame.mime }))
```

**16-bit depth PNGs.** Browsers decode 16-bit PNGs to their top 8 bits, which makes millimetre depth almost black. Decode them as a raw `16UC1` frame instead, which scales to the real range:

```ts
if (frame.kind === 'encoded' && isPng16Gray(frame.data)) frame = await decodePng16(frame.data) // needs DecompressionStream
```

**Raw** (`kind: 'raw'`, or a decoded PNG):

```ts
rawToRGBA(frame, range?: [lo, hi]): Uint8ClampedArray   // RGBA, width × height × 4
const bmp = await createImageBitmap(new ImageData(rawToRGBA(frame), frame.width, frame.height))
```

| Encoding | Handling |
|---|---|
| `rgb8`, `rgba8`, `bgr8`, `bgra8`, `8UC3`, `8UC4` | Colour, BGR swapped |
| `rgb16`, `rgba16`, `bgr16`, `bgra16` | Colour scaled to 8 bits |
| `mono8`, `8UC1` | Greyscale |
| `mono16`, `16UC1`, `16SC1`, `32FC1`, `64FC1` | Depth: scaled to `range`, or to the frame's own finite non-zero min/max (zeros stay black) |

`rawFormatSupported(encoding)` tells you whether an encoding is handled. Big-endian data (`is_bigendian`) is respected.

**Video** (`kind: 'video'`): H.264 needs state, since frames depend on earlier ones. `VideoTrackDecoder` gives random access:

```ts
const track = rec.images['/front-camera']
const decoder = new VideoTrackDecoder({
  format: track.format!,                                  // 'h264'
  get length() { return track.times.length },             // the track may still be growing
  keyframe: (i) => track.keys[i],
  data: (i) => rec.frame(track.topic, i)?.data,           // undefined → MissingFramesError
})

try {
  const vf = await decoder.frameAt(indexAt(track.times, t)) // VideoFrame, or undefined if superseded
  if (vf) ctx.drawImage(vf, 0, 0)                           // draw right away: the decoder owns it
} catch (e) {
  if (e instanceof MissingFramesError) await rec.ensure([track.topic], t, t + 2) // then try again
}
decoder.close()
```

How it decodes:

- **Seeking** starts from the nearest keyframe before the target.
- **Playing forward** continues the running decode instead of restarting.
- **Lookahead:** it feeds 16 frames past the target, so streams with B-frames still produce it.
- **Cache:** it keeps the last 48 decoded frames.
- **Latest wins:** only the newest of overlapping calls decodes; the others resolve `undefined`.

The codec string comes from the first keyframe's SPS (`avc1.4d400c`), and support is checked with `VideoDecoder.isConfigSupported`. `VideoTrackDecoder.supported()` is `false` where WebCodecs is missing (Node, older browsers).

Helpers: `isKeyframe(format, data)` (H.264 IDR / H.265 IRAP NAL units) and `codecString(format, keyframe)`.

## Message encodings and compression

| Message encoding | Schema encoding | Decoder |
|---|---|---|
| `cdr` | `ros2msg` | `@foxglove/rosmsg` + `@foxglove/rosmsg2-serialization` |
| `ros1` | `ros1msg` | `@foxglove/rosmsg` + `@foxglove/rosmsg-serialization` |
| `protobuf` | `protobuf` (FileDescriptorSet) | `protobufjs` (`int64` read as numbers) |
| `json` | any, or none | `JSON.parse` |
| anything else (`ros2idl`, flatbuffers, CBOR, …) | | Topic marked `other` with `error: 'Unsupported encoding …'` |

| Chunk compression | Supported |
|---|---|
| none, `zstd`, `lz4` | Yes |
| others | `Unsupported chunk compression "…"` |

Channel records that repeat across chunks are deduplicated. Metadata records become `metadata['<name>/<key>']`, and the header's `profile` and `library` become `metadata.profile` and `metadata.library`. Attachments are not read.

## Low-level API

These are the stages `openMcap` is built from, exported for custom pipelines.

| Export | What it does |
|---|---|
| `createDecoder(messageEncoding, schema)` | `(bytes) => object` for one channel; throws for unsupported encodings |
| `decompressHandlers` | `{ zstd, lz4 }` in the shape `@mcap/core` expects |
| `kindOfSchema(name)`, `schemaKey(name)` | Kind by schema name, and the normalised name it compares |
| `extract(message)` | `{ groups, strings }`: the chartable number groups and strings in a decoded message |
| `sniffImage(bytes)` | `'image/png' \| 'image/jpeg' \| 'image/webp' \| undefined` |
| `blobReader(blob)`, `urlReader(url, signal?)`, `openStream(src, signal?)`, `sourceName(src)` | Sources. `urlReader` probes Range once and resolves `undefined` when the server ignores it. |
| `new Recording({ maxFrameBytes, window })` + `addTopic`, `addChannel`, `addMessage`, `setMetadata`, `commit`, `finish` | Build a recording from records you parse yourself. `window` is a `WindowReader` for refetch. |

```ts
type WindowReader = (topics: string[], start: bigint, end: bigint, signal?: AbortSignal)
  => AsyncIterable<{ topic: string; logTime: bigint; data: Uint8Array }>
```

## Recipes

### Node: list what's in a file

```ts
import { openAsBlob } from 'node:fs'
import { readMcap } from '@videodb/robopeek-mcap'

const rec = await readMcap(await openAsBlob('./episode.mcap'))
for (const t of rec.topics.values()) console.log(t.kind ?? '?', t.topic, t.schema, t.count, t.error ?? '')
console.log(rec.duration.toFixed(2), 's')
```

The repository has a fuller version: `node packages/mcap/scripts/inspect.ts <file-or-url>…`.

### Browser: a file the user picked

```ts
input.onchange = async () => {
  const file = await openMcap(input.files![0]) // local files are always indexed (if the file has a summary)
  await file.load()
  render(file.recording)
}
```

### Show the camera image at time `t`

```ts
const track = rec.images['/camera/color/compressed']
const i = Math.max(0, indexAt(track.times, t))
let frame = rec.frame(track.topic, i)
if (!frame) { await rec.ensure([track.topic], t, t + 2); frame = rec.frame(track.topic, i) }
if (frame?.kind === 'encoded') img.src = URL.createObjectURL(new Blob([frame.data], { type: frame.mime }))
```

### Export a signal as CSV

```ts
const v = rec.vectors['/joint_states/position']
const rows = [['t', ...(v.names ?? [...Array(v.dim).keys()])].join(',')]
for (let i = 0; i < v.times.length; i++) rows.push([v.times[i], ...vectorAt(v, i)].join(','))
```

### Stop keeping frames you don't show

Pass a small budget when you only need signals: `openMcap(url, { maxFrameBytes: 0 })`. Charts and text still load fully.

## Using it with React

This package has no React code. React viewers for MCAP live in `@videodb/robopeek-react/mcap`, which imports this package as an **optional peer dependency**:

```sh
npm install @videodb/robopeek-react @videodb/robopeek-mcap
```

```tsx
import { McapViewer } from '@videodb/robopeek-react/mcap'
import '@videodb/robopeek-react/styles.css'

<McapViewer source="https://…/episode.mcap" />
```

If you import `@videodb/robopeek-react/mcap` without installing this package, the build or the page fails with a message naming `@videodb/robopeek-mcap`. Installing the React package never installs this one, and an RLDS-only app never downloads MCAP's decoders. See [`@videodb/robopeek-react`](https://www.npmjs.com/package/@videodb/robopeek-react).

## Errors and limits

| Situation | What happens |
|---|---|
| Server doesn't support Range | Loads fully. `indexed: false`, so frames over the budget are dropped (`framesLost`). |
| No summary / chunk index | Same as above. Topics appear as they stream in. |
| No CORS headers on the server | The browser blocks it (`TypeError: Failed to fetch`). Hugging Face allows CORS. Node is not affected. |
| Unsupported encoding (`ros2idl`, flatbuffers, CBOR) | Topic kind `other`, with the reason in `TopicInfo.error` |
| H.265, VP9, AV1 video | Not decoded yet (`Unsupported video format`) |
| No WebCodecs (Node, older browsers) | Video tracks load, but `VideoTrackDecoder.supported()` is `false` |
| Episodes inside one file (markers, time ranges) | Not split. One file is one episode. |
| Seeking past what has downloaded | Frames appear once the stream reaches them. Only released frames are fetched by range. |
| Attachments, CRC checks on refetched pieces | Not read / not checked |
| Decoding | Runs on the main thread (no Web Worker yet) |

Tested on: GR00T X-Embodiment Sim (protobuf, H.264, 3 MB), RoboMIND Franka (JPEG + 16-bit PNG depth, 74 MB), a ROBOTIS AI Worker ROS 2 bag (CDR, uncompressed, outlier log times, 43 MB) and the Humanoid IKEA Assembly set (7 cameras, 1.3 GB, refetch over Hugging Face).

## API index

| Export | Kind |
|---|---|
| `openMcap`, `readMcap` | Open (and load) a file |
| `Recording`, `indexAt`, `vectorAt` | The recording and lookups |
| `rawToRGBA`, `rawFormatSupported`, `decodePng16`, `isPng16Gray`, `sniffImage` | Pixels |
| `VideoTrackDecoder`, `MissingFramesError`, `isKeyframe`, `codecString` | Video |
| `createDecoder`, `decompressHandlers`, `extract`, `kindOfSchema`, `schemaKey` | Decoding and classification |
| `blobReader`, `urlReader`, `openStream`, `sourceName` | Sources |
| `McapFile`, `OpenOptions`, `LoadOptions`, `TopicInfo`, `TopicKind`, `ImageTrack`, `VectorTrack`, `TextTrack`, `Frame`, `VideoSource`, `WindowReader`, `Group`, `Extracted`, `Decode`, `SchemaRecord`, `Source`, `Progress`, `RangeReader` | Types |

## Related

- [`@videodb/robopeek-react`](https://www.npmjs.com/package/@videodb/robopeek-react): viewers, a player and hooks; MCAP parts under `@videodb/robopeek-react/mcap`.
- [`@videodb/robopeek-rlds`](https://www.npmjs.com/package/@videodb/robopeek-rlds): the RLDS / TFRecord reader.
- [MCAP specification](https://mcap.dev/spec)
- [RoboPeek on GitHub](https://github.com/video-db/RoboPeek)
- [Changelog](https://github.com/video-db/RoboPeek/blob/main/packages/mcap/CHANGELOG.md)

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
