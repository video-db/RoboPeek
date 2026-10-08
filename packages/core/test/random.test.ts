// Run: RLDS_SHARD=/path/to/file.tfrecord [RLDS_URL=https://…] pnpm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openAsBlob } from 'node:fs'
import { ShardIndex, streamEpisodes, episodeTitle } from '../src/index.ts'

const path = process.env.RLDS_SHARD
const url = process.env.RLDS_URL

test('random access matches streaming', { skip: !path }, async () => {
  const blob = await openAsBlob(path!)
  const streamed = []
  for await (const ep of streamEpisodes(blob)) streamed.push(ep)
  const idx = await ShardIndex.open(blob)
  for (const n of [0, 7, streamed.length - 1]) {
    const ep = await idx.episode(n)
    assert.equal(ep?.length, streamed[n].length)
    assert.equal(episodeTitle(ep!), episodeTitle(streamed[n]))
  }
  assert.equal(await idx.episode(streamed.length), undefined)
  assert.ok(idx.complete)
  assert.equal(idx.entries.length, streamed.length)
})

test('fetches single episodes over HTTP', { skip: !url }, async () => {
  const idx = await ShardIndex.open(url!)
  for (const n of [40, 41, 10]) {
    const t = performance.now()
    let read = 0
    const ep = await idx.episode(n, { onProgress: (p) => (read = p.loaded) })
    console.log(`episode ${n}: ${ep?.length} steps, "${episodeTitle(ep!)}", streamed to ${(read / 1e6).toFixed(1)} MB, ${Math.round(performance.now() - t)} ms`)
    assert.ok(ep && ep.length > 0)
  }
})
