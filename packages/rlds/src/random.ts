// Single-episode access. TFRecord has no index, so reaching an unseen record means reading through
// the ones before it. Range-hopping header to header looks cheaper but loses on high-latency CDNs
// (HF: ~600 ms per request vs ~90 ms to stream past a 1.4 MB record), so we stream-skip instead:
// one request from the last known offset, records before n are indexed but not decoded, and the
// download stops at n. Records already passed are fetched later with a single Range read.
import { readRecords } from './tfrecord.ts'
import { decodeExample } from './example.ts'
import { toEpisode, type Episode } from './episode.ts'
import type { ReadOptions, Source } from './index.ts'
import type { FeatureSpecs } from './spec.ts'

export type RangeReader = {
  size: number | undefined
  read(offset: number, length: number, signal?: AbortSignal): Promise<Uint8Array>
  stream(offset: number, signal?: AbortSignal): Promise<ReadableStream<Uint8Array>>
}

export type RecordEntry = { offset: number; length: number }
type Opts = Omit<ReadOptions, 'specs'>

export function blobReader(blob: Blob): RangeReader {
  return {
    size: blob.size,
    read: async (o, l) => new Uint8Array(await blob.slice(o, o + l).arrayBuffer()),
    stream: async (o) => blob.slice(o).stream(),
  }
}

/** Probes Range support once and pins the post-redirect URL so later reads skip the redirect hop. */
export async function urlReader(url: string | URL, signal?: AbortSignal): Promise<RangeReader> {
  const probe = await fetch(url, { headers: { Range: 'bytes=0-0' }, signal })
  if (probe.status !== 206) {
    probe.body?.cancel()
    throw new Error(
      probe.ok
        ? 'This server does not support byte-range requests, so a single episode cannot be fetched. Use the full viewer instead.'
        : `Could not fetch the file (HTTP ${probe.status}).`,
    )
  }
  await probe.arrayBuffer()
  const total = Number(probe.headers.get('content-range')?.split('/')[1])
  const pinned = probe.url || String(url)

  const ranged = async (range: string, signal?: AbortSignal) => {
    const res = await fetch(pinned, { headers: { Range: `bytes=${range}` }, signal })
    if (res.status !== 206 || !res.body) throw new Error(`Range request failed (HTTP ${res.status}).`)
    return res
  }
  return {
    size: total > 0 ? total : undefined,
    read: async (o, l, signal) => new Uint8Array(await (await ranged(`${o}-${o + l - 1}`, signal)).arrayBuffer()),
    stream: async (o, signal) => (await ranged(`${o}-`, signal)).body!,
  }
}

export class ShardIndex {
  reader: RangeReader
  entries: RecordEntry[] = []
  /** True once the end of file has been reached, so `entries.length` is the episode count. */
  complete = false
  specs: FeatureSpecs | undefined
  private queue: Promise<unknown> = Promise.resolve()

  constructor(reader: RangeReader, specs?: FeatureSpecs) {
    this.reader = reader
    this.specs = specs
  }

  static async open(src: Source, opts: { signal?: AbortSignal; specs?: FeatureSpecs } = {}) {
    return new ShardIndex(src instanceof Blob ? blobReader(src) : await urlReader(src, opts.signal), opts.specs)
  }

  /** Resolves undefined when the shard has fewer than n + 1 episodes. Calls run one at a time. */
  episode(n: number, opts: Opts = {}): Promise<Episode | undefined> {
    const run = this.queue.then(() => this.load(n, opts))
    this.queue = run.catch(() => {})
    return run
  }

  private async load(n: number, opts: Opts) {
    let body = n >= this.entries.length && !this.complete ? await this.scanTo(n, opts) : undefined
    const entry = this.entries[n]
    if (!entry) return undefined
    body ??= await this.reader.read(entry.offset + 12, entry.length, opts.signal)
    if (body.length < entry.length) throw new Error('File ends mid-record: it is truncated or not a TFRecord file.')
    return toEpisode(decodeExample(body), n, entry.length, this.specs)
  }

  private async scanTo(n: number, { signal, onProgress }: Opts) {
    const last = this.entries.at(-1)
    let offset = last ? last.offset + last.length + 16 : 0
    let loaded = offset
    const stream = await this.reader.stream(offset, signal)
    for await (const rec of readRecords(stream, (b) => onProgress?.({ loaded: (loaded += b), total: this.reader.size }))) {
      signal?.throwIfAborted()
      this.entries.push({ offset, length: rec.length })
      offset += rec.length + 16
      if (this.entries.length > n) return rec
    }
    this.complete = true
  }
}
