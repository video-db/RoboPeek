import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openMcap, readMcap, indexAt, vectorAt } from '../src/index.ts'
import { ros2File, jsonFile } from './fixtures.ts'

test('reads ROS 2 topics into time-aligned tracks', async () => {
  const rec = await readMcap(await ros2File())
  assert.deepEqual(Object.keys(rec.images), ['/camera'])
  assert.equal(rec.images['/camera'].frames[0]?.kind, 'encoded')
  assert.equal((rec.images['/camera'].frames[0] as { mime: string }).mime, 'image/jpeg')

  const pos = rec.vectors['/joint_states/position']
  assert.deepEqual(pos.names, ['a', 'b'])
  assert.equal(pos.times.length, 20)
  assert.deepEqual(vectorAt(pos, 3), [3, -3])
  assert.equal(rec.vectors['/joint_states/velocity'], undefined, 'empty arrays make no track')

  assert.equal(rec.text['/instruction'].values[0], 'pick up the cup')
  assert.match(rec.metadata['/robot_description'], /^<robot>/)
  assert.equal(rec.metadata['episode/task'], 'cups')
  assert.equal(rec.metadata.profile, 'ros2')
})

test('mis-stamped and latched messages sit at 0 instead of stretching the timeline', async () => {
  const rec = await readMcap(await ros2File())
  assert.ok(Math.abs(rec.duration - 1.9) < 1e-9, `duration ${rec.duration}`)
  assert.deepEqual(rec.text['/instruction'].times, [0])
  assert.equal(rec.images['/camera'].times[1], 0.2)
})

test('summary gives topics, counts and length before loading', async () => {
  const file = await openMcap(await ros2File())
  assert.equal(file.indexed, true)
  const info = file.recording.topics.get('/joint_states')!
  assert.equal(info.count, 20)
  assert.equal(file.recording.topics.get('/camera')!.kind, 'image')
  assert.equal(info.kind, undefined, 'decided by the first message')
  await file.load()
  assert.equal(info.kind, 'vector')
  assert.equal(info.count, 20, 'summary counts are not double-counted')
})

test('width changes pad with NaN', async () => {
  const rec = await readMcap(await jsonFile())
  const v = rec.vectors['/plot']
  assert.deepEqual(v.names, ['a', 'b'])
  assert.deepEqual(vectorAt(v, 1), [1, 2])
  assert.ok(Number.isNaN(vectorAt(v, 3)[1]))
})

test('over budget with an index: old frames are released and fetched back by window', async () => {
  const file = await openMcap(await ros2File({ seconds: 4, frameBytes: 1000 }), { maxFrameBytes: 5000 })
  await file.load()
  const rec = file.recording
  const cam = rec.images['/camera']
  assert.ok(rec.frameBytes <= 5000)
  assert.equal(cam.frames[0], undefined)
  assert.ok(cam.frames.at(-1))
  await rec.ensure(['/camera'], 0, 0.5)
  assert.ok(cam.frames[0] && cam.frames[1] && cam.frames[2])
  assert.equal(rec.framesLost, false)
})

test('refetch reads windows whose chunks hold no Channel records (channels come from the summary)', async () => {
  const file = await openMcap(await ros2File({ seconds: 4, frameBytes: 1000, latched: false }), { maxFrameBytes: 5000 })
  await file.load()
  const cam = file.recording.images['/camera']
  const i = cam.times.indexOf(1.6)
  assert.equal(cam.frames[i], undefined)
  await file.recording.ensure(['/camera'], 1.6, 1.7)
  assert.ok(cam.frames[i])
})

test('over budget without an index: keeps the first frames and reports the rest as lost', async () => {
  const file = await openMcap(await ros2File({ seconds: 4, frameBytes: 1000, indexed: false }), { maxFrameBytes: 5000 })
  assert.equal(file.indexed, false)
  assert.equal(file.recording.topics.size, 0)
  await file.load()
  const cam = file.recording.images['/camera']
  assert.ok(cam.frames[0])
  assert.equal(cam.frames.at(-1), undefined)
  assert.equal(file.recording.framesLost, true)
  assert.equal(cam.times.length, 20, 'timestamps are kept even when bytes are not')
})

test('indexAt finds the last sample at or before t', () => {
  const times = [0, 0.1, 0.2, 0.2, 0.5]
  assert.equal(indexAt(times, -1), -1)
  assert.equal(indexAt(times, 0), 0)
  assert.equal(indexAt(times, 0.2), 3)
  assert.equal(indexAt(times, 0.3), 3)
  assert.equal(indexAt(times, 9), 4)
})
