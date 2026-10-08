import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decodeExample, toEpisode, episodeTitle, parseFeatureSpecs, readText, readNumbers, type Feature } from '../src/index.ts'

const enc = new TextEncoder()
const bytes = (...s: string[]): Feature => ({ kind: 'bytes', values: s.map((v) => enc.encode(v)) })
const floats = (...v: number[]): Feature => ({ kind: 'float', values: Float32Array.from(v) })

// Hand-encoded protobuf: Example{features{feature{"id": Int64List{-1, 2^60}}}}
function int64Example(): Uint8Array {
  const varint = (n: bigint) => {
    const out: number[] = []
    let u = BigInt.asUintN(64, n)
    do {
      out.push(Number(u & 0x7fn) | (u > 0x7fn ? 0x80 : 0))
      u >>= 7n
    } while (u > 0n)
    return out
  }
  const ld = (field: number, body: number[]) => [(field << 3) | 2, ...varint(BigInt(body.length)), ...body]
  const packed = [...varint(-1n), ...varint(2n ** 60n)]
  const feature = ld(3, ld(1, packed))
  const entry = [...ld(1, [...enc.encode('id')]), ...ld(2, feature)]
  return Uint8Array.from(ld(1, ld(1, entry)))
}

test('int64 features decode losslessly', () => {
  const f = decodeExample(int64Example()).get('id')!
  assert.equal(f.kind, 'int64')
  assert.deepEqual([...(f.values as BigInt64Array)], [-1n, 2n ** 60n])
  assert.equal(readNumbers(f)![0], -1)
})

test('classifies tracks and keeps raw metadata', () => {
  const ep = toEpisode(
    new Map([
      ['steps/is_first', floats(1, 0)],
      ['steps/action', floats(1, 2, 3, 4)],
      ['steps/language_instruction', bytes('pick', 'pick')],
      ['episode_metadata/file_path', bytes('a.npz')],
    ]),
    0,
    0,
  )
  assert.equal(ep.length, 2)
  assert.deepEqual(ep.vectors['action'].shape, [2])
  assert.deepEqual(readText(ep.metadata['episode_metadata/file_path']), ['a.npz'])
  assert.equal(ep.features.size, 4)
  assert.equal(episodeTitle(ep), 'pick')
})

test('specs restore shapes and turn large numeric tensors into images', () => {
  const specs = parseFeatureSpecs({
    featuresDict: {
      features: {
        steps: {
          sequence: {
            feature: {
              featuresDict: {
                features: {
                  is_first: { tensor: { shape: {}, dtype: 'bool' } },
                  depth: { pythonClassName: 'x.Tensor', tensor: { shape: { dimensions: ['32', '40'] }, dtype: 'float32' } },
                  box: { tensor: { shape: { dimensions: ['2', '3'] }, dtype: 'float32' } },
                },
              },
            },
          },
        },
      },
    },
  })
  assert.deepEqual(specs.get('steps/depth')?.shape, [32, 40])
  const ep = toEpisode(
    new Map([
      ['steps/is_first', floats(1)],
      ['steps/depth', floats(...new Array(32 * 40).fill(0))],
      ['steps/box', floats(1, 2, 3, 4, 5, 6)],
    ]),
    0,
    0,
    specs,
  )
  assert.deepEqual(ep.images['depth'], { kind: 'raw', shape: [32, 40, 1], data: ep.images['depth'].kind === 'raw' ? ep.images['depth'].data : null })
  assert.deepEqual(ep.vectors['box'].shape, [2, 3])
})

test('title prefers natural language and skips empty strings', () => {
  const ep = toEpisode(
    new Map([
      ['steps/is_first', floats(1)],
      ['steps/observation/structured_language_instruction', bytes('place_box')],
      ['steps/observation/natural_language_instruction', bytes('put it in the box')],
      ['steps/language_instruction_2', bytes('')],
    ]),
    0,
    0,
  )
  assert.equal(episodeTitle(ep), 'put it in the box')
})
