# @robopeek/react

React viewers, a composable player and hooks for RLDS robot-learning episodes. Part of [RoboPeek](https://github.com/video-db/RoboPeek). Includes and re-exports [`@robopeek/rlds`](https://www.npmjs.com/package/@robopeek/rlds).

```sh
npm install @robopeek/react
```

```tsx
import { ShardViewer } from '@robopeek/react'
import '@robopeek/react/styles.css'

<ShardViewer defaultSource="https://…/train.tfrecord-00000-of-00128" />
```

Or arrange the player yourself:

```tsx
import { Player, useEpisode } from '@robopeek/react'

const { episode } = useEpisode(url, 40)

{episode && (
  <Player.Root episode={episode}>
    <Player.Frames />
    <Player.Transport />
    <Player.Tracks include={['action']} />
  </Player.Root>
)}
```

Styles live in `@layer robopeek` and are themed with `--rp-*` CSS variables. Full docs, including Tailwind setup and hooks-only use: [guide](https://github.com/video-db/RoboPeek/blob/main/docs/guide.md).

Requires React 19.
