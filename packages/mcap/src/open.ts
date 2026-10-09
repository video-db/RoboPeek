import { McapByteReader, McapIndexedReader, McapStreamReader, parseRecord, type IReadable, type TypedMcapRecord } from '@mcap/core'
import { decompressHandlers, type SchemaRecord } from './decode.ts'
import { Recording, type WindowReader } from './recording.ts'
import { blobReader, openStream, sourceName, urlReader, type Progress, type RangeReader, type Source } from './source.ts'

export type OpenOptions = {
  signal?: AbortSignal
  /** Frame bytes to keep in memory (default 512 MiB). Indexed files release old frames and fetch them back on demand. */
  maxFrameBytes?: number
}
export type LoadOptions = { signal?: AbortSignal; onProgress?: (p: Progress) => void }

export type McapFile = {
  name: string
  size: number | undefined
  /** Has a summary index and Range access: topics and length are known before loading, and frames can be refetched. */
  indexed: boolean
  recording: Recording
  /** Streams the whole file into `recording` in one request. */
  load(opts?: LoadOptions): Promise<void>
}

type ReadOpts = { signal?: AbortSignal }

function readable(r: RangeReader): IReadable<ReadOpts> {
  return { size: async () => BigInt(r.size), read: (o, l, opts) => r.read(Number(o), Number(l), opts?.signal) }
}

const GAP = 1 << 20
const PIECE = 4 << 20

/**
 * Reads the chunks overlapping [start, end] as ~4 MB pieces of whole chunks, parsed in order as they land, so the
 * first frames show before the window finishes. High-latency hosts (Hugging Face spends ~0.5 s per request) favour
 * a few mid-size requests over one per chunk or one huge one.
 */
function windowReader(reader: McapIndexedReader<ReadOpts>, r: RangeReader): WindowReader {
  return async function* (topics, start, end, signal) {
    const chunks = reader.chunkIndexes
      .filter((c) => c.messageStartTime <= end && c.messageEndTime >= start)
      .sort((a, b) => Number(a.chunkStartOffset - b.chunkStartOffset))
    const pieces: [number, number][] = []
    for (const c of chunks) {
      const a = Number(c.chunkStartOffset)
      const b = a + Number(c.chunkLength + c.messageIndexLength)
      const last = pieces.at(-1)
      if (last && a - last[1] <= GAP && b - last[0] <= PIECE) last[1] = b
      else pieces.push([a, b])
    }
    // Two pieces in flight: the next downloads while this one decodes, and the first isn't slowed by the rest.
    const reads: Promise<Uint8Array>[] = []
    const fetchPiece = (k: number) => {
      if (k < pieces.length && !reads[k]) {
        reads[k] = r.read(pieces[k][0], pieces[k][1] - pieces[k][0], signal)
        reads[k].catch(() => {})
      }
      return reads[k]
    }
    fetchPiece(1)
    const wanted = new Set(topics)
    for (let k = 0; k < pieces.length; k++) {
      const bytes = await fetchPiece(k)
      fetchPiece(k + 2)
      for (const rec of records(bytes)) {
        if (rec.type !== 'Message' || rec.logTime < start || rec.logTime > end) continue
        const topic = reader.channelsById.get(rec.channelId)?.topic
        if (topic && wanted.has(topic)) yield { topic, logTime: rec.logTime, data: rec.data }
      }
    }
  }
}

const view = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset, b.byteLength)

// Records in a span of whole chunks, chunk contents included. Not McapStreamReader: it rejects messages whose
// Channel record came earlier in the file, and channels here come from the summary.
function* records(bytes: Uint8Array): Generator<TypedMcapRecord> {
  const outer = new McapByteReader(view(bytes))
  for (let rec; (rec = parseRecord(outer, false)); ) {
    if (rec.type !== 'Chunk') {
      yield rec
      continue
    }
    const decompress = decompressHandlers[rec.compression as keyof typeof decompressHandlers]
    if (rec.compression && !decompress) throw new Error(`Unsupported chunk compression "${rec.compression}".`)
    const inner = new McapByteReader(view(decompress ? decompress(rec.records, rec.uncompressedSize) : rec.records))
    for (let r; (r = parseRecord(inner, false)); ) yield r
  }
}

/** Reads the file's summary (when it has one and the source allows Range reads). Messages arrive with `load()`. */
export async function openMcap(src: Source, opts: OpenOptions = {}): Promise<McapFile> {
  const ranged = src instanceof Blob ? blobReader(src) : await urlReader(src, opts.signal)
  let indexed: McapIndexedReader<ReadOpts> | undefined
  if (ranged) {
    try {
      indexed = await McapIndexedReader.Initialize({ readable: readable(ranged), decompressHandlers, readOptions: { signal: opts.signal } })
      if (!indexed.chunkIndexes.length) indexed = undefined
    } catch (e) {
      // No summary or index (e.g. a recording that was cut off): fall back to reading it start to end.
      if (opts.signal?.aborted) throw e
    }
  }
  const recording = new Recording({ maxFrameBytes: opts.maxFrameBytes, window: indexed && ranged ? windowReader(indexed, ranged) : undefined })
  if (indexed) {
    const stats = indexed.statistics
    for (const ch of indexed.channelsById.values()) {
      const count = stats?.channelMessageCounts.get(ch.id)
      recording.addTopic(ch.topic, indexed.schemasById.get(ch.schemaId)?.name ?? '', ch.messageEncoding, Number(count ?? 0))
    }
    if (stats?.messageCount) recording.summaryEnd = stats.messageEndTime
  }
  return {
    name: sourceName(src),
    size: ranged?.size,
    indexed: !!indexed,
    recording,
    load: (o) => streamInto(recording, src, o),
  }
}

async function streamInto(rec: Recording, src: Source, { signal, onProgress }: LoadOptions = {}) {
  const { stream, total } = await openStream(src, signal)
  const reader = new McapStreamReader({ decompressHandlers })
  const schemas = new Map<number, SchemaRecord>()
  const it = stream.getReader()
  let loaded = 0
  for (;;) {
    if (signal?.aborted) {
      await it.cancel()
      return
    }
    const { done, value } = await it.read()
    if (done) break
    loaded += value.length
    reader.append(value)
    for (let r; (r = reader.nextRecord()); ) {
      if (r.type === 'Message') rec.addMessage(r.channelId, r.logTime, r.data)
      else if (r.type === 'Schema') schemas.set(r.id, r)
      else if (r.type === 'Channel') rec.addChannel(r.id, r.topic, r.messageEncoding, schemas.get(r.schemaId))
      else if (r.type === 'Header') {
        if (r.profile) rec.setMetadata('profile', r.profile)
        if (r.library) rec.setMetadata('library', r.library)
      } else if (r.type === 'Metadata') for (const [k, v] of r.metadata) rec.setMetadata(`${r.name}/${k}`, v)
    }
    rec.commit()
    onProgress?.({ loaded, total })
  }
  rec.finish()
}

/** Opens and fully loads a recording; for scripts and tests. */
export async function readMcap(src: Source, opts: OpenOptions & LoadOptions = {}): Promise<Recording> {
  const file = await openMcap(src, opts)
  await file.load(opts)
  return file.recording
}
