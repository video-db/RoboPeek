<!-- PROJECT SHIELDS -->

[![rlds version][rlds-shield]][rlds-url]
[![react version][react-shield]][react-url]
[![CI][ci-shield]][ci-url]
[![Issues][issues-shield]][issues-url]

<br />
<p align="center">
  <img src="assets/mascot.png" alt="RoboPeek mascot" width="200" />

  <h3 align="center">RoboPeek</h3>

  <p align="center">
    Preview robotics datasets in the browser, straight from the source files.
    <br />
    <a href="packages/react#readme"><strong>React docs »</strong></a>
    ·
    <a href="packages/rlds#readme"><strong>Reader docs »</strong></a>
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

RoboPeek lets you open them in a web page instead. Point it at a dataset file, or a link to one, and it shows each episode's camera views, actions, robot state, language instruction and metadata, playing step by step. Everything runs in the browser. There's no server to host and nothing to convert. Where the file allows it, RoboPeek downloads only the episode you asked for.

It's built as open-source npm packages, so any app can embed it: dataset catalogues, labelling tools, research dashboards. [datasets.bot](https://datasets.bot) is the first.

### Formats

| Format | Used by | Status |
|---|---|---|
| **RLDS / TFDS** (TFRecord shards) | Open X-Embodiment, DROID, Bridge, RT-1, and most TFDS robotics datasets | ✅ Available |
| **MCAP** | ROS 1 / ROS 2 recordings, Foxglove, FiftyOne exports | ✅ Available |

Each format has its own reader and its own React package, so an app that only needs RLDS never installs MCAP's decoders, and the reverse. The two React packages share class names and theme tokens, so one theme covers both.

## Packages

| Package | What it does | Docs |
|---|---|---|
| [`@videodb/robopeek-react`](packages/react) | Ready-made viewers, a player you can rearrange, hooks and themeable CSS. Installs and re-exports the reader. | [README](packages/react#readme) |
| [`@videodb/robopeek-rlds`](packages/rlds) | Reads RLDS episodes from TFRecord shards. No UI, no dependencies; works with any framework, or none, in the browser or Node. | [README](packages/rlds#readme) |
| [`@videodb/robopeek-mcap-react`](packages/mcap-react) | MCAP viewer and a time-based player, hooks and the same themeable CSS. Installs and re-exports the MCAP reader. | [README](packages/mcap-react#readme) |
| [`@videodb/robopeek-mcap`](packages/mcap) | Reads MCAP recordings (ROS 1, ROS 2, protobuf, JSON) into time-aligned camera, chart and text tracks. No UI; browser or Node. | [README](packages/mcap#readme) |

**Which one do I install?** Pick the format, then React or not. Building with React: `@videodb/robopeek-react` (RLDS) or `@videodb/robopeek-mcap-react` (MCAP); each brings its reader. Anything else, such as Vue, Svelte, plain JS or a Node script: the reader alone.

```sh
npm install @videodb/robopeek-react        # RLDS viewers + reader
npm install @videodb/robopeek-rlds         # RLDS reader only
npm install @videodb/robopeek-mcap-react   # MCAP viewer + reader
npm install @videodb/robopeek-mcap         # MCAP reader only
```

## Quick start

```tsx
import { ShardViewer } from '@videodb/robopeek-react'
import '@videodb/robopeek-react/styles.css'

export function App() {
  return <ShardViewer source="https://huggingface.co/datasets/<org>/<dataset>/resolve/main/<split>.tfrecord-00000-of-00128" />
}
```

You get an episode list that fills in while the file downloads, and a player with the cameras, playback controls, a chart for every action and state track, and the episode's metadata.

## Everything you can do

Use as much or as little as you need. Each level gives you more control than the one before it.

### 1. Drop in a viewer

Two components, one stylesheet.

```tsx
// Every episode in a shard, streamed as it downloads
<ShardViewer source={url} />

// One episode by number, without downloading the rest of the shard
<EpisodeViewer source={url} episode={n} onEpisodeChange={setN} />

// A file the user picked
<ShardViewer source={file} empty={<p>Pick a .tfrecord file</p>} />
```

→ [Viewers](packages/react#viewers)

### 2. Choose what's shown

The player is made of parts. List the ones you want, in the order you want; leave out the rest. Filter cameras and charts by key.

```tsx
<ShardViewer source={url}>
  <Player.Stage>
    <Player.Frames include={['observation/image']} />
    <Player.Transport />
  </Player.Stage>
  <Player.Tracks include={(key) => !key.includes('embedding')} />
</ShardViewer>
```

→ [The player](packages/react#the-player)

### 3. Add your own panels

Any component inside the player can read the current episode and step with `usePlayer`, and re-renders only when what it reads changes.

```tsx
function RewardBadge() {
  const track = usePlayer((s) => s.episode.vectors.reward)
  const step = usePlayer((s) => s.step)
  return track ? <span>reward {vectorAt(track, step)[0].toFixed(2)}</span> : null
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

Set a few CSS variables, target the `rp-*` classes, switch to dark, or import the layout-only stylesheet and style everything yourself. Library CSS sits in its own `@layer`, so your rules win without `!important`, and it works with Tailwind.

```css
:root {
  --rp-accent: #4f46e5;
  --rp-font-sans: 'Geist', system-ui, sans-serif;
}
.my-viewer .rp-options { display: none; }
```

```tsx
<ShardViewer source={url} colorScheme="dark" className="my-viewer" />
```

→ [Styling](packages/react#styling)

### 7. Bring your own UI entirely (React)

Use the data hooks for loading and playback, and render everything yourself.

```tsx
const { episode, status } = useEpisode(url, n)
const { step, toggle, playing } = usePlayback({ length: episode?.length ?? 0, resetKey: episode })
```

→ [Data hooks](packages/react#data-hooks)

### 8. No React at all

The reader gives you plain data: camera frames as image bytes, actions and states as typed arrays, instructions as strings. Use it in any framework, a worker, or a Node script.

```ts
import { streamEpisodes, ShardIndex, episodeTitle, vectorAt } from '@videodb/robopeek-rlds'

// Every episode, as the shard downloads
for await (const ep of streamEpisodes(url)) {
  console.log(ep.index, ep.length, episodeTitle(ep), Object.keys(ep.images))
}

// One episode, without downloading the rest
const shard = await ShardIndex.open(url)
const ep = await shard.episode(40)
const action = vectorAt(ep!.vectors.action, 0)
```

→ [Reader docs](packages/rlds#readme)

## How it works

1. **Fetch.** For a whole shard, RoboPeek streams the file and hands you each episode as soon as its bytes arrive. For one episode, it uses HTTP Range requests to skip what it can, and fetches an episode it has already passed with a single exact request.
2. **Decode.** It parses TFRecord framing and the `tf.train.Example` records in JavaScript, then sorts every feature by what it contains: images by their file signature, numbers into per-step tracks, text into instructions, the rest into metadata. Nothing depends on a particular dataset's field names.
3. **Restore shapes.** If the dataset ships a `features.json` (TFDS does), RoboPeek uses it to turn flat arrays back into depth images and matrices.
4. **Play.** Frames are decoded to canvases on demand, a few steps ahead, so scrubbing stays smooth even on long episodes.

## Supported datasets

Tested on one shard each of CognitiveDrone, RT-1 (fractal), Bridge, TACO Play, Berkeley UR5, Language Table, Austin BUDS, NYU Door Opening, Stanford Hydra and DROID. Other RLDS datasets should work too. If one doesn't, please [open an issue](https://github.com/video-db/RoboPeek/issues).

Things to know:

- **CORS.** A browser can only read files from servers that allow cross-origin requests. Hugging Face does. The public Open X-Embodiment bucket on Google Cloud Storage doesn't; download the file and open it locally instead.
- **One episode by number** needs a server with HTTP Range support. Local files always work.
- **GZIP-compressed shards** aren't supported yet.
- **Frame rate.** RLDS doesn't record one, so playback speed is a setting (10 fps by default).

## Roadmap

- MCAP: episode boundaries inside one file, seeking ahead of the download, H.265 / VP9 / AV1 video
- Decoding in Web Workers
- Caching and a saved episode index for faster re-opens
- GZIP-compressed shards

See the [open issues](https://github.com/video-db/RoboPeek/issues) for more.

## Repository

```
packages/
  rlds/        @videodb/robopeek-rlds: the RLDS reader
  react/       @videodb/robopeek-react: RLDS viewers, player, hooks, CSS
  mcap/        @videodb/robopeek-mcap: the MCAP reader
  mcap-react/  @videodb/robopeek-mcap-react: MCAP viewer, player, hooks, CSS
apps/
  web/      the RoboPeek website and live demo (MCAP viewer at /mcap.html)
docs/       architecture notes
```

- [Architecture](docs/architecture.md): how the packages are built
- [THESIS.md](THESIS.md) and [THESIS_REVIEW.md](THESIS_REVIEW.md): why RoboPeek exists and how it's shaped
- Changelogs: [`@videodb/robopeek-rlds`](packages/rlds/CHANGELOG.md), [`@videodb/robopeek-react`](packages/react/CHANGELOG.md), `@videodb/robopeek-mcap` and `@videodb/robopeek-mcap-react` (created on their first release)

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, how to add a changelog note, and how releases work.

1. Fork the project
2. Create a branch (`git checkout -b feature/my-change`)
3. Commit your changes, with a changelog note if a package changed (`pnpm changeset`)
4. Push the branch and open a pull request

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

[rlds-shield]: https://img.shields.io/npm/v/@videodb/robopeek-rlds?style=for-the-badge
[rlds-url]: https://www.npmjs.com/package/@videodb/robopeek-rlds
[react-shield]: https://img.shields.io/npm/v/@videodb/robopeek-react?style=for-the-badge
[react-url]: https://www.npmjs.com/package/@videodb/robopeek-react
[ci-shield]: https://img.shields.io/github/actions/workflow/status/video-db/RoboPeek/ci.yml?branch=main&style=for-the-badge&label=CI
[ci-url]: https://github.com/video-db/RoboPeek/actions/workflows/ci.yml
[issues-shield]: https://img.shields.io/github/issues/video-db/RoboPeek.svg?style=for-the-badge
[issues-url]: https://github.com/video-db/RoboPeek/issues
