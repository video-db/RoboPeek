# @videodb/robopeek-mcap

Reads MCAP recordings in the browser (or Node) into time-aligned tracks: cameras, numeric signals and text. No UI and no framework. React components live in [`@videodb/robopeek-react/mcap`](../react#entry-points).

```sh
npm install @videodb/robopeek-mcap
```

## Quick start

```ts
import { openMcap } from '@videodb/robopeek-mcap'

const file = await openMcap('https://huggingface.co/datasets/…/episode.mcap') // or a File / Blob
const rec = file.recording            // topics and length are known now (from the file's summary)
rec.subscribe(() => draw(rec))        // fires as messages arrive
await file.load({ onProgress: (p) => console.log(p.loaded, p.total) })

rec.images['/camera/compressed']      // { times, frames, … }
rec.vectors['/joint_states/position'] // { times, dim, names, data }
rec.text['/instruction']              // { times, values }
```

`readMcap(source)` opens and loads in one call (for scripts and tests).

## What it reads

| | Supported |
|---|---|
| Message encodings | ROS 2 (CDR + `ros2msg`), ROS 1, protobuf, JSON |
| Chunk compression | zstd, lz4, none |
| Images | `sensor_msgs/CompressedImage`, `sensor_msgs/Image`, `foxglove.CompressedImage`, `foxglove.RawImage` |
| Video | `foxglove.CompressedVideo` H.264, decoded with WebCodecs (`VideoTrackDecoder`, browsers only) |
| Depth | 16-bit PNG (`decodePng16`) and raw `16UC1` / `32FC1` (`rawToRGBA`), scaled to their own range |
| Charts | Any other message: numbers that share a parent object (or one numeric array) become one track, named from a sibling string list when there is one (`JointState.name`). Stamps, durations, binary data and arrays over 64 values are skipped. |
| Text | Messages with a single string (`std_msgs/String`, instructions). Text over 500 characters (URDFs) goes to `metadata`. |
| Not shown | Calibration, transforms, point clouds, scans and markers. They are listed in `topics` with kind `other`. |

## Time

- Time is seconds from `rec.origin`, the log time where the recording's bulk starts. Messages logged before it (latched topics, clocks that started at boot) sit at 0, so they can't stretch the timeline across decades.
- Every track has its own `times`. `indexAt(times, t)` gives the sample shown at time `t`.
- `rec.length` is the timeline length. It comes from the summary while loading, and from the data otherwise.

## Memory and Range reads

`load()` streams the file in a single request. Frame bytes are kept up to `maxFrameBytes` (default 512 MiB):

| File / server | Over the budget |
|---|---|
| Has a summary index, and the server supports Range (or the source is a local file) | The least recently used frames outside the playhead's window are released. `rec.ensure(topics, t0, t1)` reads back only the chunks that hold them, as ~4 MB requests. |
| No index, or no Range support | New frames are no longer kept, and `rec.framesLost` is set. Timestamps are always kept. |

Set the budget above a few seconds of all camera streams, so the lookahead fits.

## API

| Export | |
|---|---|
| `openMcap(src, { signal, maxFrameBytes })` | → `McapFile { name, size, indexed, recording, load({ signal, onProgress }) }` |
| `readMcap(src, opts)` | Opens and loads; resolves to the `Recording`. |
| `Recording` | `topics`, `images`, `vectors`, `text`, `metadata`, `origin`, `length`, `duration`, `version`, `subscribe()`, `frame(topic, i)`, `ensure()`, `refetchable`, `frameBytes`, `framesLost` |
| `indexAt`, `vectorAt` | Lookups by time and by row. |
| `VideoTrackDecoder` | Random access into an H.264 track: decodes forward from the nearest keyframe and caches recent frames. |
| `rawToRGBA`, `decodePng16`, `isPng16Gray` | Pixels for raw and 16-bit frames. |
| `extract`, `kindOfSchema`, `createDecoder` | The classification and decoding steps, for custom pipelines. |
| `blobReader`, `urlReader` | Range readers for a `Blob` or a URL. |

## Not yet

- Episode boundaries inside one file (markers, time ranges). Today one file is one episode.
- Seeking ahead of the download. Frames show once the stream reaches them; only released frames are fetched by range.
- H.265, VP9 and AV1 video; decoding in a Web Worker.
