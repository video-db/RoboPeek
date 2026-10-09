import type { Feature } from './example.ts'
import type { FeatureSpecs } from './spec.ts'

export type ImageTrack =
  | { kind: 'encoded'; mime: 'image/png' | 'image/jpeg' | 'image/webp'; frames: Uint8Array[] }
  /** Numeric image tensor (e.g. float depth). Only produced when a feature spec gives its shape. */
  | { kind: 'raw'; shape: [h: number, w: number, c: number]; data: Float32Array | Float64Array }

/** Row-major [length × dim]. */
export type VectorTrack = {
  /** Per-step shape; [dim] unless a feature spec says otherwise. */
  shape: number[]
  dim: number
  data: Float32Array | Float64Array
}

export type Episode = {
  index: number
  length: number
  byteSize: number
  images: Record<string, ImageTrack>
  vectors: Record<string, VectorTrack>
  text: Record<string, string[]>
  /** Non-step features (episode_metadata/* etc.) and step bytes that are neither image nor text. */
  metadata: Record<string, Feature>
  /** Every decoded key, lossless. The other fields are views over these. */
  features: Map<string, Feature>
}

const STEP = 'steps/'
const LENGTH_KEYS = ['is_first', 'is_last', 'is_terminal', 'reward', 'discount']

const strict = new TextDecoder('utf-8', { fatal: true })

function sniffImage(b: Uint8Array | undefined) {
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

const numbers = (f: Exclude<Feature, { kind: 'bytes' }>) => (f.kind === 'float' ? f.values : Float64Array.from(f.values, Number))

/** UTF-8 strings of a bytes feature; undefined for numeric or binary features. */
export function readText(f: Feature | undefined): string[] | undefined {
  return f?.kind === 'bytes' ? asText(f.values) : undefined
}

/** Numeric values as floats (int64 exact to 2^53; read `feature.values` for the exact bigint). */
export function readNumbers(f: Feature | undefined): Float32Array | Float64Array | undefined {
  return f && f.kind !== 'bytes' ? numbers(f) : undefined
}

/** One-line display string, as the metadata panel shows it. */
export function formatFeature(f: Feature): string {
  if (f.kind !== 'bytes') return Array.from(f.values.slice(0, 16), String).join(', ') + (f.values.length > 16 ? ` … (${f.values.length})` : '')
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

const product = (s: number[]) => s.reduce((a, b) => a * b, 1)

// A spec'd numeric tensor of rank 2, or rank 3 with 1/3/4 channels, at least 32×32, is an image (e.g. float
// depth). The size floor keeps small matrices (poses, bounds) as vectors.
function imageShape(shape: number[] | undefined): [number, number, number] | undefined {
  if (!shape || shape[0] < 32 || shape[1] < 32) return
  if (shape.length === 2) return [shape[0], shape[1], 1]
  if (shape.length === 3 && [1, 3, 4].includes(shape[2])) return shape as [number, number, number]
}

/** Maps an RLDS-flattened Example (steps/* keys) onto per-step tracks. Specs, when given, restore shapes. */
export function toEpisode(features: Map<string, Feature>, index: number, byteSize: number, specs?: FeatureSpecs): Episode {
  const length = stepCount(features)
  const ep: Episode = { index, length, byteSize, images: {}, vectors: {}, text: {}, metadata: {}, features }

  for (const [key, f] of features) {
    const name = key.startsWith(STEP) ? key.slice(STEP.length) : undefined
    const perStep = name !== undefined && length > 0 && f.values.length % length === 0

    if (!perStep) {
      ep.metadata[key] = f
    } else if (f.kind !== 'bytes') {
      const dim = f.values.length / length
      const spec = specs?.get(key)?.shape
      const shape = spec && spec.every((d) => d > 0) && product(spec) === dim ? spec : [dim]
      const img = imageShape(shape === spec ? spec : undefined)
      if (img) ep.images[name] = { kind: 'raw', shape: img, data: numbers(f) }
      else ep.vectors[name] = { shape, dim, data: numbers(f) }
    } else if (f.values.length !== length) {
      ep.metadata[key] = f
    } else {
      const mime = sniffImage(f.values[0])
      const text = mime ? undefined : asText(f.values)
      if (mime) ep.images[name] = { kind: 'encoded', mime, frames: f.values }
      else if (text) ep.text[name] = text
      else ep.metadata[key] = f
    }
  }
  return ep
}

export function vectorAt(v: VectorTrack, step: number): Float32Array | Float64Array {
  return v.data.subarray(step * v.dim, (step + 1) * v.dim)
}

const titleRank = (key: string) => {
  const leaf = key.split('/').pop()!
  return leaf === 'natural_language_instruction' ? 0 : leaf === 'language_instruction' ? 1 : leaf.includes('instruction') ? 2 : 3
}

/** The first non-empty language instruction (natural language preferred), else the first non-empty text value. */
export function episodeTitle(ep: Episode): string | undefined {
  const ordered = Object.keys(ep.text).sort((a, b) => titleRank(a) - titleRank(b))
  for (const k of ordered) {
    const v = ep.text[k][0]?.trim()
    if (v) return v
  }
}

type RawImage = Extract<ImageTrack, { kind: 'raw' }>

/** Value range a raw track is scaled to: single-channel (depth) uses the track's finite min/max, colour assumes 0–1 or 0–255. */
export function rawRange(t: RawImage): [number, number] {
  let lo = Infinity
  let hi = -Infinity
  for (const v of t.data) {
    if (!Number.isFinite(v)) continue
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  return lo < hi ? [lo, hi] : [0, 1]
}

/** RGBA pixels of frame `i` of a raw (numeric tensor) image track. */
export function rgbaAt(t: RawImage, i: number, [lo, hi]: [number, number] = rawRange(t)): Uint8ClampedArray<ArrayBuffer> {
  const [h, w, c] = t.shape
  const off = i * h * w * c
  const d = new Uint8ClampedArray(w * h * 4)
  const scale = c === 1 ? 255 / (hi - lo) : hi <= 1 ? 255 : 1
  for (let p = 0; p < h * w; p++) {
    const o = p * 4
    if (c === 1) {
      const v = t.data[off + p]
      d[o] = d[o + 1] = d[o + 2] = Number.isFinite(v) ? (v - lo) * scale : 0
    } else {
      d[o] = t.data[off + p * c] * scale
      d[o + 1] = t.data[off + p * c + 1] * scale
      d[o + 2] = t.data[off + p * c + 2] * scale
    }
    d[o + 3] = 255
  }
  return d
}

/** Frames in an image track. */
export function frameCount(t: ImageTrack): number {
  return t.kind === 'encoded' ? t.frames.length : t.data.length / (t.shape[0] * t.shape[1] * t.shape[2])
}
