<!-- PROJECT SHIELDS -->

[![rlds version][rlds-shield]][rlds-url]
[![mcap version][mcap-shield]][mcap-url]
[![react version][react-shield]][react-url]
[![CI][ci-shield]][ci-url]
[![Issues][issues-shield]][issues-url]
[![License][license-shield]][license-url]

<br />
<p align="center">
  <img src="assets/mascot.png" alt="RoboPeek mascot" width="200" />

  <h3 align="center">RoboPeek</h3>

  <p align="center">
    Preview robotics datasets in the browser, straight from the source files.
    <br />
    <a href="packages/react#readme"><strong>React docs »</strong></a>
    ·
    <a href="packages/rlds#readme"><strong>RLDS reader docs »</strong></a>
    ·
    <a href="packages/mcap#readme"><strong>MCAP reader docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/video-db/RoboPeek/issues">Report Bug</a>
    ·
    <a href="https://github.com/video-db/RoboPeek/issues">Request Feature</a>
  </p>
</p>

<p align="center">
  Maintained by
  <a href="https://videodb.io">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="assets/videodb-logo-dark.png" />
      <img src="assets/videodb-logo.png" alt="VideoDB" height="18" align="center" />
    </picture>
  </a>
</p>

## What is RoboPeek?

Robotics datasets are huge, and they come in formats built for training, not for looking at. To check what a single demonstration contains, you normally download gigabytes of shards, set up Python and TensorFlow or ROS, and write a script.

RoboPeek lets you open them in a web page instead. Point it at a dataset file, or a link to one, and it shows each episode's camera views, actions, robot state, language instruction and metadata, playing in sync. Everything runs in the browser. There's no server to host and nothing to convert. Where the file allows it, RoboPeek downloads only what you're looking at.

It's built as open-source npm packages, so any app can embed it: dataset catalogues, labelling tools, research dashboards. [datasets.bot](https://datasets.bot) is the first.

### Formats

| Format | Used by | Reader | React entry |
|---|---|---|---|
| **RLDS / TFDS** (TFRecord shards) | Open X-Embodiment, DROID, Bridge, RT-1, and most TFDS robotics datasets | `@videodb/robopeek-rlds` | `@videodb/robopeek-react/rlds` |
| **MCAP** | ROS 1 / ROS 2 bags, Foxglove recordings, FiftyOne exports | `@videodb/robopeek-mcap` | `@videodb/robopeek-react/mcap` |

## Packages

| Package | What it does | Depends on | Docs |
|---|---|---|---|
| [`@videodb/robopeek-rlds`](packages/rlds) | Reads RLDS episodes from TFRecord shards: stream a whole shard, or open one episode by number with HTTP Range requests. No UI. Browser or Node. | nothing | [README](packages/rlds#readme) |
| [`@videodb/robopeek-mcap`](packages/mcap) | Reads MCAP recordings (ROS 1, ROS 2, protobuf, JSON; H.264 video; 16-bit depth) into time-aligned camera, signal and text tracks. Keeps memory under a budget with Range refetch. No UI. Browser or Node. | `@mcap/core`, zstd/lz4, ROS and protobuf decoders | [README](packages/mcap#readme) |
| [`@videodb/robopeek-react`](packages/react) | Ready-made viewers, a player you can take apart, hooks and themeable CSS. One package for every format. | `react`; the readers as **optional** peers | [README](packages/react#readme) |

## How the packages fit together

```
             your app
      ┌─────────┴──────────────────────────┐
      ▼                                     ▼
@videodb/robopeek-react/rlds     @videodb/robopeek-react/mcap      ← format glue: viewers, hooks, adapters
      │          │                    │           │
      │          └──────┐   ┌─────────┘           │
      │                 ▼   ▼                     │
      │        @videodb/robopeek-react            │                ← format-free player, parts, styles
      ▼                                           ▼
@videodb/robopeek-rlds                 @videodb/robopeek-mcap      ← readers: plain data, no UI
```

**Concerns.**

- Readers turn files into plain data: an RLDS `Episode`, an MCAP `Recording`. They know nothing about UI.
- The React package's root entry is a player that reads one format-free shape, the **`Timeline`**: tracks of samples on a step or seconds axis. It knows nothing about file formats.
- `@videodb/robopeek-react/rlds` and `/mcap` are the glue: an adapter from each reader's data to a `Timeline`, plus that format's viewers, hooks and parts (RLDS step flags, the MCAP topic list).

**Dependencies.**

- The readers are **optional peer dependencies** of the React package. Installing `@videodb/robopeek-react` installs neither, and you add the one you use. An RLDS app never downloads MCAP's decoders; an MCAP app never downloads the RLDS reader.
- The root entry imports no reader. `/rlds` imports only the RLDS reader, `/mcap` only the MCAP reader, and neither imports the other. CI checks this on the built files (`check:boundaries`), including type-only imports.
- Your bundle contains only what you import.

**Guided failures.** Crossing a boundary fails with a message that says what to do:

- **Importing `/mcap` without installing `@videodb/robopeek-mcap`.** The bundler or Node names the missing package. Vite says `Could not resolve "@videodb/robopeek-mcap" … Is it installed?`.
- **Passing an RLDS `Episode` straight to the player.** `got an RLDS Episode. Convert it first: import { useEpisodeTimeline } from '@videodb/robopeek-react/rlds'`.
- **Putting an RLDS part in an MCAP player.** `<Flags> comes from '@videodb/robopeek-react/rlds' … but this player shows a 'mcap' timeline`.

The full table is in [the React docs](packages/react#when-a-boundary-is-crossed).

## Install

| You want | Run | Then import from |
|---|---|---|
| RLDS viewers in React | `npm install @videodb/robopeek-react @videodb/robopeek-rlds` | `@videodb/robopeek-react/rlds` |
| MCAP viewers in React | `npm install @videodb/robopeek-react @videodb/robopeek-mcap` | `@videodb/robopeek-react/mcap` |
| Both formats in React | `npm install @videodb/robopeek-react @videodb/robopeek-rlds @videodb/robopeek-mcap` | both |
| The player for your own data | `npm install @videodb/robopeek-react` | `@videodb/robopeek-react` |
| RLDS data, no React (Vue, Svelte, plain JS, workers, Node) | `npm install @videodb/robopeek-rlds` | `@videodb/robopeek-rlds` |
| MCAP data, no React | `npm install @videodb/robopeek-mcap` | `@videodb/robopeek-mcap` |

- **Module format:** all packages are ESM only, with types included.
- **Runtimes:** the readers run in modern browsers and Node 20+.
- **React:** the React package needs React 19.
- **Versions:** each package is versioned on its own. `@videodb/robopeek-react` accepts any reader version in its peer range: `@videodb/robopeek-rlds >=0.2.0 <1.0.0` and `@videodb/robopeek-mcap >=0.1.0 <1.0.0`. A reader that's too old fails with a message naming the version it needs.

## Quick start

RLDS shard:

```tsx
import { ShardViewer } from '@videodb/robopeek-react/rlds'
import '@videodb/robopeek-react/styles.css'

export function App() {
  return (
    <div style={{ height: 640 }}>
      <ShardViewer source="https://huggingface.co/datasets/<org>/<dataset>/resolve/main/<split>.tfrecord-00000-of-00128" />
    </div>
  )
}
```

You get an episode list that fills in while the file downloads, and a player with the cameras, playback controls, a chart for every action and state track, step flags and the episode's metadata.

MCAP recording:

```tsx
import { McapViewer } from '@videodb/robopeek-react/mcap'
import '@videodb/robopeek-react/styles.css'

export function App() {
  return (
    <div style={{ height: 640 }}>
      <McapViewer source="https://huggingface.co/datasets/<org>/<dataset>/resolve/main/episode.mcap" />
    </div>
  )
}
```

You get every camera (JPEG, PNG, depth, raw, H.264), a chart per signal (joint states with joint names, poses, commands), the task instruction, the file's metadata and a list of every topic. It plays in real time while the file is still downloading.

## Everything you can do

Use as much or as little as you need. Each level gives you more control than the one before it. Levels 2–6 work the same for every format, because the player and parts are shared.

### 1. Drop in a viewer

```tsx
import { ShardViewer, EpisodeViewer } from '@videodb/robopeek-react/rlds'
import { McapViewer } from '@videodb/robopeek-react/mcap'

<ShardViewer source={url} />                                     // every episode in a shard, streamed
<EpisodeViewer source={url} episode={n} onEpisodeChange={setN} /> // one episode, without the rest of the shard
<McapViewer source={url} />                                      // one MCAP recording
<ShardViewer source={file} empty={<p>Pick a .tfrecord file</p>} /> // a File the user picked
```

→ [Viewers](packages/react#viewers)

### 2. Choose what's shown

The player is made of parts. List the ones you want, in the order you want; leave out the rest. Filter cameras and charts by key.

```tsx
import { Player } from '@videodb/robopeek-react'

<McapViewer source={url}>
  <Player.Stage>
    <Player.Frames include={['/camera_left/color/compressed']} />
    <Player.Transport />
  </Player.Stage>
  <Player.Tracks include={(key) => key.startsWith('/joint_states')} />
</McapViewer>
```

→ [The player](packages/react#the-player)

### 3. Add your own panels

Any component inside the player can read the current state with `usePlayer`, and re-renders only when what it reads changes. For the format's own object, use `useCurrentEpisode()` (`/rlds`) or `useCurrentRecording()` (`/mcap`).

```tsx
import { Player, rowAt, usePlayer } from '@videodb/robopeek-react'

function RewardBadge() {
  const track = usePlayer((s) => s.timeline.vectors.reward)
  const step = usePlayer((s) => s.position)
  return track ? <span>reward {rowAt(track, step)[0].toFixed(2)}</span> : null
}

<ShardViewer source={url}>
  <Player.Stage />
  <RewardBadge />
  <Player.Metadata title="Episode info" />
</ShardViewer>
```

→ [Reading player state](packages/react#reading-player-state-useplayer)

### 4. Replace one built-in item

Every list part (`Frames`, `Tracks`, `Metadata`) takes `renderItem`, which receives the built-in element as a fallback.

```tsx
<Player.Tracks renderItem={(key, track, fallback) => (key === 'action' ? <MyActionPlot track={track} /> : fallback)} />
```

### 5. Use your own buttons

Every control is a hook plus a little markup. Keep the hook, render your design system's component.

```tsx
function MyPlay() {
  const { playing, buttonProps } = usePlayButton()
  return <Button {...buttonProps}>{playing ? 'Pause' : 'Play'}</Button>
}
```

→ [Part hooks](packages/react#part-hooks-our-behaviour-your-markup)

### 6. Restyle it

Set a few CSS variables, target the `rp-*` classes, switch to dark, or import the layout-only stylesheet and style everything yourself. Library CSS sits in its own `@layer`, so your rules win without `!important`, and it works with Tailwind. One theme covers every format.

```css
:root {
  --rp-accent: #4f46e5;
  --rp-font-sans: 'Geist', system-ui, sans-serif;
}
.my-viewer .rp-options { display: none; }
```

```tsx
<McapViewer source={url} colorScheme="dark" className="my-viewer" />
```

→ [Styling](packages/react#styling)

### 7. Bring your own UI entirely (React)

Use the data hooks for loading, and the playback hook for the clock. Render everything yourself.

```tsx
import { usePlayback } from '@videodb/robopeek-react'
import { useEpisode } from '@videodb/robopeek-react/rlds'

const { episode } = useEpisode(url, n)
const { position, toggle, playing } = usePlayback({ unit: 'step', end: (episode?.length ?? 1) - 1, resetKey: episode })
```

→ [Data hooks](packages/react#data-hooks)

### 8. Your own format

The player plays any `Timeline`. Write a reader for your format, plus a small adapter, and every part, viewer recipe and theme works with it.

```tsx
import { Player, steps, type Timeline } from '@videodb/robopeek-react'

const times = steps(run.length)
const timeline: Timeline = {
  format: 'my-format', unit: 'step', end: run.length - 1,
  images: {}, vectors: { torque: { times, dim: 7, data: run.torque } },
  text: { goal: { times, values: run.goals } }, metadata: { robot: run.robot },
}
<Player timeline={timeline} />
```

→ [Adding your own format](packages/react#adding-your-own-format)

### 9. No React at all

The readers give you plain data. Use them in any framework, a worker, or a Node script.

```ts
import { streamEpisodes, ShardIndex, episodeTitle, vectorAt } from '@videodb/robopeek-rlds'

for await (const ep of streamEpisodes(url)) console.log(ep.index, ep.length, episodeTitle(ep))
const ep = await (await ShardIndex.open(url)).episode(40) // one episode, without the rest of the shard
```

```ts
import { readMcap, indexAt, vectorAt } from '@videodb/robopeek-mcap'

const rec = await readMcap(url)
const joints = rec.vectors['/joint_states/position']
console.log(joints.names, vectorAt(joints, indexAt(joints.times, 2.5))) // joint values at t = 2.5 s
```

→ [RLDS reader docs](packages/rlds#readme) · [MCAP reader docs](packages/mcap#readme)

## How it works

### RLDS

1. **Fetch.** For a whole shard, RoboPeek streams the file and hands you each episode as soon as its bytes arrive. For one episode, it uses HTTP Range requests to skip what it can. An episode it has already passed comes back with a single exact request.
2. **Decode.** It parses TFRecord framing and the `tf.train.Example` records in JavaScript, then sorts every feature by what it contains:
   - images by their file signature;
   - numbers into per-step tracks;
   - text into instructions;
   - the rest into metadata.

   Nothing depends on a particular dataset's field names.
3. **Restore shapes.** If the dataset ships a `features.json` (TFDS does), RoboPeek uses it to turn flat arrays back into depth images and matrices.
4. **Play.** The player counts in steps, at a speed you choose (RLDS records no frame rate).

### MCAP

1. **Summary first.** A few small Range requests read the file's summary: topics, schemas, message counts and length. A 1.3 GB file takes 4 requests.
2. **Stream.** One request streams the file. Messages are decoded as they arrive (ROS 2 CDR, ROS 1, protobuf, JSON; zstd and lz4 chunks).
3. **Classify.**
   - Cameras are recognised by schema (compressed, raw, H.264 video).
   - Other messages are walked for numbers, which become charts named after their fields, with joint names where the message has them.
   - Single strings become text tracks, such as task instructions.
4. **Align in time.** Every sample keeps its timestamp, so cameras and signals at different rates line up. A robust origin ignores latched or mis-stamped messages that would otherwise stretch the timeline.
5. **Stay within memory.** Frame bytes are capped. Frames released under the cap are read back on demand, about 4 MB at a time, from just the chunks that hold them.
6. **Play.** The player counts in real time. H.264 decodes with WebCodecs from the nearest keyframe.

### Both

Frames are decoded to canvases on demand, a few samples ahead, so scrubbing stays smooth. Charts of long, high-rate signals are drawn per pixel column, so 500 Hz joint states stay fast.

## Supported data

**RLDS.**

- **Tested on:** one shard each of CognitiveDrone, RT-1 (fractal), Bridge, TACO Play, Berkeley UR5, Language Table, Austin BUDS, NYU Door Opening, Stanford Hydra and DROID.
- **One episode by number** needs a server with HTTP Range support. Local files always work.
- **GZIP-compressed shards** aren't supported yet.
- **Frame rate:** RLDS doesn't record one, so playback speed is a setting (10 fps by default).

**MCAP.**

- **Tested on:**
  - GR00T X-Embodiment Sim (protobuf, H.264);
  - RoboMIND (JPEG and 16-bit depth PNG);
  - a ROBOTIS AI Worker ROS 2 bag;
  - the 1.3 GB Humanoid IKEA Assembly set.
- **Not supported yet:**
  - `ros2idl`, FlatBuffers and CBOR encodings, which are listed as topics but not shown;
  - H.265, VP9 and AV1 video;
  - splitting one file into several episodes.
- **Range support:** without it, files still load, but frames beyond the memory budget can't be kept.

**Both.**

- **CORS:** a browser can only read files from servers that allow cross-origin requests. Hugging Face does. The public Open X-Embodiment bucket on Google Cloud Storage doesn't, so download the file and open it locally instead.
- **Other datasets** should work too. If one doesn't, please [open an issue](https://github.com/video-db/RoboPeek/issues).

## Roadmap

- MCAP: episode boundaries inside one file, seeking ahead of the download, H.265 / VP9 / AV1 video, `ros2idl` schemas
- Decoding in Web Workers
- Caching and a saved episode index for faster re-opens
- GZIP-compressed shards

See the [open issues](https://github.com/video-db/RoboPeek/issues) for more.

## Repository

```
packages/
  rlds/     @videodb/robopeek-rlds: the RLDS reader
  mcap/     @videodb/robopeek-mcap: the MCAP reader
  react/    @videodb/robopeek-react: player, viewers, hooks, CSS (src/core, src/rlds, src/mcap)
apps/
  web/      the RoboPeek website and live demo (MCAP viewer at /mcap.html)
docs/       architecture notes
```

- [Architecture](docs/architecture.md): how the packages are built
- [THESIS.md](THESIS.md) and [THESIS_REVIEW.md](THESIS_REVIEW.md): why RoboPeek exists and how it's shaped
- Changelogs: [`@videodb/robopeek-rlds`](packages/rlds/CHANGELOG.md), [`@videodb/robopeek-react`](packages/react/CHANGELOG.md), `@videodb/robopeek-mcap` (created on its first release)

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, how to add a changelog note, and how releases work.

1. Fork the project
2. Create a branch (`git checkout -b feature/my-change`)
3. Commit your changes, with a changelog note if a package changed (`pnpm changeset`)
4. Push the branch and open a pull request

## License

MIT. See [LICENSE](LICENSE). Every published package (`@videodb/robopeek-rlds`, `@videodb/robopeek-mcap`, `@videodb/robopeek-react`) ships under the same terms.

---

<p align="center">
  Maintained by
  <a href="https://videodb.io">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="assets/videodb-logo-dark.png" />
      <img src="assets/videodb-logo.png" alt="VideoDB" height="18" align="center" />
    </picture>
  </a>
</p>

<!-- MARKDOWN LINKS & IMAGES -->

[rlds-shield]: https://img.shields.io/npm/v/@videodb/robopeek-rlds?style=for-the-badge&label=robopeek-rlds
[rlds-url]: https://www.npmjs.com/package/@videodb/robopeek-rlds
[mcap-shield]: https://img.shields.io/npm/v/@videodb/robopeek-mcap?style=for-the-badge&label=robopeek-mcap
[mcap-url]: https://www.npmjs.com/package/@videodb/robopeek-mcap
[react-shield]: https://img.shields.io/npm/v/@videodb/robopeek-react?style=for-the-badge&label=robopeek-react
[react-url]: https://www.npmjs.com/package/@videodb/robopeek-react
[ci-shield]: https://img.shields.io/github/actions/workflow/status/video-db/RoboPeek/ci.yml?branch=main&style=for-the-badge&label=CI
[ci-url]: https://github.com/video-db/RoboPeek/actions/workflows/ci.yml
[issues-shield]: https://img.shields.io/github/issues/video-db/RoboPeek.svg?style=for-the-badge
[issues-url]: https://github.com/video-db/RoboPeek/issues
[license-shield]: https://img.shields.io/github/license/video-db/RoboPeek.svg?style=for-the-badge
[license-url]: https://github.com/video-db/RoboPeek/blob/main/LICENSE
