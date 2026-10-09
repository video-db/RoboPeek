import { readRecords } from './tfrecord.ts'
import { decodeExample } from './example.ts'
import { toEpisode, type Episode } from './episode.ts'
import type { FeatureSpecs } from './spec.ts'

export { readRecords } from './tfrecord.ts'
export { decodeExample, type Feature } from './example.ts'
export {
  toEpisode,
  vectorAt,
  episodeTitle,
  readText,
  readNumbers,
  formatFeature,
  rawRange,
  rgbaAt,
  frameCount,
  type Episode,
  type ImageTrack,
  type VectorTrack,
} from './episode.ts'
export { parseFeatureSpecs, loadFeatureSpecs, type FeatureSpec, type FeatureSpecs } from './spec.ts'
export { ShardIndex, blobReader, urlReader, type RangeReader, type RecordEntry } from './random.ts'

export type Source = Blob | string | URL
export type Progress = { loaded: number; total?: number }
export type ReadOptions = {
  signal?: AbortSignal
  onProgress?: (p: Progress) => void
  /** From `loadFeatureSpecs` / `parseFeatureSpecs`; restores tensor shapes and numeric images. */
  specs?: FeatureSpecs
}

export async function openSource(src: Source, signal?: AbortSignal) {
  if (src instanceof Blob) return { stream: src.stream(), total: src.size }
  const res = await fetch(src, { signal })
  if (!res.ok || !res.body) throw new Error(`Could not fetch the file (HTTP ${res.status}).`)
  const len = Number(res.headers.get('content-length'))
  return { stream: res.body, total: len > 0 ? len : undefined }
}

/** Streams episodes out of an RLDS TFRecord shard (local Blob/File or URL) as bytes arrive. */
export async function* streamEpisodes(src: Source, opts: ReadOptions = {}): AsyncGenerator<Episode> {
  const { stream, total } = await openSource(src, opts.signal)
  let loaded = 0
  let index = 0
  for await (const rec of readRecords(stream, (n) => opts.onProgress?.({ loaded: (loaded += n), total }))) {
    if (opts.signal?.aborted) return
    yield toEpisode(decodeExample(rec), index++, rec.length, opts.specs)
  }
}
