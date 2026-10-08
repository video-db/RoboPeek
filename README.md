<!-- PROJECT SHIELDS -->

[![rlds version][rlds-shield]][rlds-url]
[![react version][react-shield]][react-url]
[![CI][ci-shield]][ci-url]
[![Issues][issues-shield]][issues-url]
[![Website][website-shield]][website-url]

<br />
<p align="center">
  <h3 align="center">RoboPeek</h3>

  <p align="center">
    Preview robot-learning episodes in the browser, straight from the dataset files.
    <br />
    <a href="docs/guide.md"><strong>Read the guide »</strong></a>
    <br />
    <br />
    <a href="https://github.com/video-db/RoboPeek/issues">Report Bug</a>
    ·
    <a href="https://github.com/video-db/RoboPeek/issues">Request Feature</a>
  </p>
</p>

## What is RoboPeek?

Robot-learning datasets ship as large files that hold many episodes. To look at one episode you normally download the whole file and open it with Python and TensorFlow. RoboPeek reads the file in the browser instead. It shows camera frames, actions, states, the language instruction and episode metadata, and it can open a single episode without downloading the rest.

- **RLDS / TFDS** (TFRecord shards, e.g. Open X-Embodiment) works today.
- **MCAP** is next, as its own package.
- No backend, no Python, no TensorFlow.

## Packages

| Package | What it is |
|---|---|
| [`@robopeek/rlds`](packages/rlds) | Reads RLDS episodes from TFRecord shards. Works in any framework, or none. |
| [`@robopeek/react`](packages/react) | Ready-made viewers, a player you can rearrange, and hooks. Includes `@robopeek/rlds`. |

## Installation

```sh
npm install @robopeek/react   # viewer + reader
npm install @robopeek/rlds    # reader only
```

## Quick start

### Drop a viewer into a React app

```tsx
import { ShardViewer } from '@robopeek/react'
import '@robopeek/react/styles.css'

export default function App() {
  return <ShardViewer defaultSource="https://huggingface.co/datasets/…/train.tfrecord-00000-of-00128" />
}
```

`ShardViewer` streams the whole shard into an episode list next to the player. `EpisodeViewer` opens one episode by number.

### Read episodes without React

```ts
import { streamEpisodes, ShardIndex, episodeTitle } from '@robopeek/rlds'

// Every episode, as the shard downloads
for await (const ep of streamEpisodes(url)) {
  console.log(ep.index, ep.length, episodeTitle(ep), Object.keys(ep.images))
}

// One episode, without downloading the rest (needs HTTP Range support)
const index = await ShardIndex.open(url)
const ep40 = await index.episode(40)
```

### Build your own player

```tsx
import { Player, usePlayer, useEpisode, vectorAt } from '@robopeek/react'

// Any component inside Player.Root can read the episode and the current step
function Reward() {
  const track = usePlayer((s) => s.episode.vectors.reward)
  const step = usePlayer((s) => s.step)
  return track ? <p>reward {vectorAt(track, step)[0]}</p> : null
}

function MyPlayer({ url, n }: { url: string; n: number }) {
  const { episode } = useEpisode(url, n)
  if (!episode) return null
  return (
    <Player.Root episode={episode}>
      <Player.Frames />
      <Player.Transport />
      <Reward />
    </Player.Root>
  )
}
```

The [guide](docs/guide.md) covers every option: custom parts, restyling with CSS variables, Tailwind, hooks-only use, and reading episode metadata.

## Supported datasets

Tested on episodes from CognitiveDrone, RT-1 (fractal), Bridge, TACO Play, Berkeley UR5, Language Table, Austin BUDS, NYU Door Opening, Stanford Hydra and DROID. Nothing is keyed to one dataset, so other RLDS datasets should load too. Known limits are listed in the [guide](docs/guide.md#dataset-compatibility).

## Roadmap

- MCAP support (`@robopeek/mcap`)
- Decoding in Web Workers
- Caching and a saved episode index for faster re-opens
- GZIP-compressed shards

See the [open issues](https://github.com/video-db/RoboPeek/issues) for more.

## Documentation

- [Guide](docs/guide.md): usage, API, styling, dataset compatibility
- [Architecture](docs/architecture.md): how the packages are built
- [THESIS.md](THESIS.md) and [THESIS_REVIEW.md](THESIS_REVIEW.md): why the project exists and how it is shaped
- Changelogs: [`@robopeek/rlds`](packages/rlds/CHANGELOG.md), [`@robopeek/react`](packages/react/CHANGELOG.md) (created on first release)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, how to record a change for the changelog, and how releases work.

<!-- MARKDOWN LINKS & IMAGES -->

[rlds-shield]: https://img.shields.io/npm/v/@robopeek/rlds?style=for-the-badge&label=%40robopeek%2Frlds
[rlds-url]: https://www.npmjs.com/package/@robopeek/rlds
[react-shield]: https://img.shields.io/npm/v/@robopeek/react?style=for-the-badge&label=%40robopeek%2Freact
[react-url]: https://www.npmjs.com/package/@robopeek/react
[ci-shield]: https://img.shields.io/github/actions/workflow/status/video-db/RoboPeek/ci.yml?branch=main&style=for-the-badge&label=CI
[ci-url]: https://github.com/video-db/RoboPeek/actions/workflows/ci.yml
[issues-shield]: https://img.shields.io/github/issues/video-db/RoboPeek.svg?style=for-the-badge
[issues-url]: https://github.com/video-db/RoboPeek/issues
[website-shield]: https://img.shields.io/website?url=https%3A%2F%2Fvideodb.io%2F&style=for-the-badge&label=videodb.io
[website-url]: https://videodb.io/
