import { toEpisode, type Feature } from '@robopeek/core'

const floats = (...v: number[]): Feature => ({ kind: 'float', values: Float32Array.from(v) })
const enc = new TextEncoder()

/** A 10-step episode with two vector tracks, an instruction and one metadata key. */
export function makeEpisode(index = 0, length = 10) {
  const steps = Array.from({ length }, (_, i) => i)
  return toEpisode(
    new Map<string, Feature>([
      ['steps/is_first', floats(...steps.map((i) => (i === 0 ? 1 : 0)))],
      ['steps/action', floats(...steps.flatMap((i) => [i, -i]))],
      ['steps/observation/state', floats(...steps.map((i) => i * 2))],
      ['steps/language_instruction', { kind: 'bytes', values: steps.map(() => enc.encode(`task ${index}`)) }],
      ['episode_metadata/file_path', { kind: 'bytes', values: [enc.encode(`ep${index}.npz`)] }],
    ]),
    index,
    0,
  )
}
