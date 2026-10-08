// Run: RLDS_SHARD=/path/to/file.tfrecord pnpm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openAsBlob } from 'node:fs'
import { streamEpisodes, readRecords, episodeTitle } from '../src/index.ts'

const path = process.env.RLDS_SHARD

function rechunk(blob: Blob, size: number): ReadableStream<Uint8Array> {
  let off = 0
  return new ReadableStream({
    async pull(c) {
      if (off >= blob.size) return c.close()
      c.enqueue(new Uint8Array(await blob.slice(off, (off += size)).arrayBuffer()))
    },
  })
}

test('decodes every episode of a shard', { skip: !path }, async () => {
  const blob = await openAsBlob(path!)
  const eps = []
  for await (const ep of streamEpisodes(blob)) eps.push(ep)
  assert.ok(eps.length > 0)
  for (const ep of eps) {
    for (const v of Object.values(ep.vectors)) assert.equal(v.data.length, v.dim * ep.length)
    for (const im of Object.values(ep.images)) assert.equal(im.frames.length, ep.length)
  }
  const e = eps[0]
  console.log(eps.length, 'episodes;', e.length, 'steps;', Object.keys(e.images), Object.fromEntries(Object.entries(e.vectors).map(([k, v]) => [k, v.dim])), episodeTitle(e), e.metadata)
})

test('tiny chunks yield identical records', { skip: !path }, async () => {
  const blob = await openAsBlob(path!)
  const whole: number[] = []
  for await (const r of readRecords(blob.stream())) whole.push(r.length)
  const tiny: number[] = []
  for await (const r of readRecords(rechunk(blob, 997))) tiny.push(r.length)
  assert.deepEqual(tiny, whole)
})
