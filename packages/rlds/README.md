# @videodb/robopeek-rlds

Read RLDS / TFDS robot-learning episodes from TFRecord shards in the browser or Node, without Python or TensorFlow. Part of [RoboPeek](https://github.com/video-db/RoboPeek).

```sh
npm install @videodb/robopeek-rlds
```

```ts
import { streamEpisodes, ShardIndex, loadFeatureSpecs, episodeTitle } from '@videodb/robopeek-rlds'

const specs = await loadFeatureSpecs(url) // the features.json next to the shard, if there is one

// Every episode, as the shard downloads
for await (const ep of streamEpisodes(url, { specs })) {
  console.log(ep.index, ep.length, episodeTitle(ep), Object.keys(ep.images))
}

// One episode, without downloading the rest (needs HTTP Range support)
const index = await ShardIndex.open(url, { specs })
const ep40 = await index.episode(40)
```

Each `Episode` has `images` (camera frames), `vectors` (actions, states, rewards), `text` (instructions), `metadata` (`episode_metadata/*`) and `features` (every decoded key, raw).

For a viewer, use [`@videodb/robopeek-react`](https://www.npmjs.com/package/@videodb/robopeek-react). Full docs: [guide](https://github.com/video-db/RoboPeek/blob/main/docs/guide.md).
