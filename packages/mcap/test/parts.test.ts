import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extract, kindOfSchema, isKeyframe, codecString, rawToRGBA, type Frame } from '../src/index.ts'

test('extract groups scalars by parent and names arrays from sibling string lists', () => {
  const { groups, strings } = extract({
    header: { stamp: { sec: 1, nanosec: 2 }, frame_id: 'base' },
    name: ['j1', 'j2'],
    position: new Float64Array([1, 2]),
    pose: { position: { x: 1, y: 2, z: 3 } },
    covariance: new Array(100).fill(0),
    data: new Uint8Array(10),
  })
  assert.deepEqual(groups.map((g) => g.path), ['pose.position', 'position'])
  assert.deepEqual(groups[1].names, ['j1', 'j2'])
  assert.deepEqual(groups[0].names, ['x', 'y', 'z'])
  assert.deepEqual(strings, [])
})

test('extract reads a single-point list and skips durations', () => {
  const { groups } = extract({ joint_names: ['a'], points: [{ positions: [0.5], time_from_start: { sec: 0, nanosec: 0 } }] })
  assert.deepEqual(groups.map((g) => [g.path, g.names]), [['points.positions', ['a']]])
})

test('kinds by schema name across ROS 1, ROS 2 and Foxglove', () => {
  assert.equal(kindOfSchema('sensor_msgs/msg/CompressedImage'), 'image')
  assert.equal(kindOfSchema('sensor_msgs/Image'), 'image')
  assert.equal(kindOfSchema('foxglove_msgs/msg/CompressedVideo'), 'video')
  assert.equal(kindOfSchema('foxglove.CompressedVideo'), 'video')
  assert.equal(kindOfSchema('tf2_msgs/msg/TFMessage'), 'other')
  assert.equal(kindOfSchema('my_pkg/msg/Thing'), undefined)
})

test('H.264 keyframes and codec string come from the Annex B NAL units', () => {
  const sps = [0, 0, 0, 1, 0x67, 0x4d, 0x40, 0x0c, 0xaa]
  const idr = [0, 0, 1, 0x65, 0x88]
  const p = [0, 0, 1, 0x41, 0x9a]
  assert.equal(isKeyframe('h264', Uint8Array.from([...sps, ...idr])), true)
  assert.equal(isKeyframe('h264', Uint8Array.from(p)), false)
  assert.equal(codecString('h264', Uint8Array.from([...sps, ...idr])), 'avc1.4d400c')
  assert.equal(codecString('vp9', Uint8Array.from(sps)), undefined)
})

test('raw images: bgr8 swaps channels, 16-bit depth scales to its range', () => {
  const bgr: Frame = { kind: 'raw', width: 1, height: 1, encoding: 'bgr8', step: 3, bigEndian: false, data: Uint8Array.from([10, 20, 30]) }
  assert.deepEqual([...rawToRGBA(bgr)], [30, 20, 10, 255])
  const depth = new Uint8Array(4)
  new DataView(depth.buffer).setUint16(0, 1000, true)
  new DataView(depth.buffer).setUint16(2, 3000, true)
  const d: Frame = { kind: 'raw', width: 2, height: 1, encoding: '16UC1', step: 4, bigEndian: false, data: depth }
  const px = rawToRGBA(d)
  assert.equal(px[0], 0)
  assert.equal(px[4], 255)
})
