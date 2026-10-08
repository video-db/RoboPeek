import type { Feature } from './example.ts'

export type ImageTrack = { mime: string; frames: Uint8Array[] }
/** Row-major [length × dim]. */
export type VectorTrack = { dim: number; data: Float32Array | Float64Array }

export type Episode = {
  index: number
  length: number
  byteSize: number
  images: Record<string, ImageTrack>
  vectors: Record<string, VectorTrack>
  text: Record<string, string[]>
  /** Non-step features (episode_metadata/* etc.) and step bytes that are neither image nor text. */
  metadata: Record<string, string>
}

const STEP = 'steps/'
const LENGTH_KEYS = ['is_first', 'is_last', 'is_terminal', 'reward', 'discount']

const strict = new TextDecoder('utf-8', { fatal: true })

function sniffImage(b: Uint8Array | undefined): string | undefined {
  if (!b || b.length < 4) return
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) return 'image/webp'
}

function asText(values: Uint8Array[]): string[] | undefined {
  try {
    return values.map((v) => strict.decode(v))
  } catch {
    return undefined
  }
}

function summarize(f: Feature): string {
  if (f.kind !== 'bytes') return Array.from(f.values.slice(0, 16)).join(', ') + (f.values.length > 16 ? ` … (${f.values.length})` : '')
  const text = asText(f.values)
  if (text) return text.join(' | ')
  return `${f.values.length} × binary (${f.values.reduce((s, v) => s + v.length, 0)} B)`
}

function stepCount(features: Map<string, Feature>): number {
  for (const k of LENGTH_KEYS) {
    const f = features.get(STEP + k)
    if (f) return f.values.length
  }
  for (const [k, f] of features) if (k.startsWith(STEP) && f.kind === 'bytes') return f.values.length
  return 1
}

/** Maps an RLDS-flattened Example (steps/* keys) onto per-step tracks. */
export function toEpisode(features: Map<string, Feature>, index: number, byteSize: number): Episode {
  const length = stepCount(features)
  const ep: Episode = { index, length, byteSize, images: {}, vectors: {}, text: {}, metadata: {} }

  for (const [key, f] of features) {
    const name = key.startsWith(STEP) ? key.slice(STEP.length) : undefined
    const perStep = name !== undefined && length > 0 && f.values.length % length === 0

    if (!perStep) {
      ep.metadata[key] = summarize(f)
    } else if (f.kind !== 'bytes') {
      ep.vectors[name] = { dim: f.values.length / length, data: f.values }
    } else if (f.values.length !== length) {
      ep.metadata[key] = summarize(f)
    } else {
      const mime = sniffImage(f.values[0])
      const text = mime ? undefined : asText(f.values)
      if (mime) ep.images[name] = { mime, frames: f.values }
      else if (text) ep.text[name] = text
      else ep.metadata[key] = summarize(f)
    }
  }
  return ep
}

export function vectorAt(v: VectorTrack, step: number): Float32Array | Float64Array {
  return v.data.subarray(step * v.dim, (step + 1) * v.dim)
}

/** The language instruction if present, else the first text track's first value. */
export function episodeTitle(ep: Episode): string | undefined {
  const keys = Object.keys(ep.text)
  const key = keys.find((k) => k.includes('instruction')) ?? keys[0]
  return key ? ep.text[key][0] : undefined
}
