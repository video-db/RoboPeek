import { extract, kindOfSchema, schemaKey, ENCODED_IMAGE, RAW_IMAGE, type TopicKind } from './classify.ts'
import { createDecoder, type Decode, type SchemaRecord } from './decode.ts'
import { encodedFrame, rawFrame, type Frame } from './image.ts'
import { isKeyframe } from './video.ts'

export type TopicInfo = {
  topic: string
  schema: string
  encoding: string
  /** From the file summary when present, else counted while loading. */
  count: number
  /** undefined until the first message decides it (for schemas we don't recognise by name). */
  kind: TopicKind | undefined
  error?: string
}

export type ImageTrack = {
  topic: string
  kind: 'image' | 'video'
  /** Seconds from the recording's origin, ascending. */
  times: number[]
  /** undefined: not in memory (released under the memory budget, or not fetched yet). */
  frames: (Frame | undefined)[]
  /** Video only: keyframe flags, kept when frame bytes are released. */
  keys: boolean[]
  /** Video codec as recorded, e.g. 'h264'. */
  format?: string
}

/** Row-major [times.length × dim]. Messages with a different width are padded with NaN or cut. */
export type VectorTrack = { topic: string; times: number[]; dim: number; names?: string[]; data: number[] }
export type TextTrack = { topic: string; times: number[]; values: string[] }

/** Fetches messages of `topics` with log times in [start, end] (ns). Set for files with an index and Range access. */
export type WindowReader = (
  topics: string[],
  start: bigint,
  end: bigint,
  signal?: AbortSignal,
) => AsyncIterable<{ topic: string; logTime: bigint; data: Uint8Array }>

type Channel = { topic: string; decode?: Decode; frame?: (m: Record<string, unknown>) => Frame | undefined; info: TopicInfo }
type Pending = { ch: Channel; logTime: bigint; data: Uint8Array }

// Text this long (URDFs, configs) is metadata, not something to show over the video.
const LONG_TEXT = 500
const ORIGIN_SAMPLE = 64
const ORIGIN_WINDOW = 60_000_000_000n
// Shortest refetch, in seconds: fewer, larger reads beat many small ones on high-latency hosts.
const MIN_WINDOW = 2

/** Last index with times[i] <= t; -1 before the first. */
export function indexAt(times: ArrayLike<number>, t: number): number {
  let lo = 0
  let hi = times.length - 1
  let best = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (times[mid] <= t) { best = mid; lo = mid + 1 } else hi = mid - 1
  }
  return best
}

/** Index to insert t at so `times` stays sorted (after equal values). */
function insertionPoint(times: number[], t: number) {
  const n = times.length
  return n === 0 || t >= times[n - 1] ? n : indexAt(times, t) + 1
}

/** Values of row i of a vector track. */
export function vectorAt(v: VectorTrack, i: number): number[] {
  return v.data.slice(i * v.dim, (i + 1) * v.dim)
}

/**
 * One MCAP file as time-aligned tracks. Filled while the file loads; `subscribe` fires after each batch.
 * Time is seconds from `origin`, the log time where the recording's bulk starts. Latched or mis-stamped
 * messages logged before it (tf_static, robot_description) sit at 0.
 */
export class Recording {
  readonly topics = new Map<string, TopicInfo>()
  readonly images: Record<string, ImageTrack> = {}
  readonly vectors: Record<string, VectorTrack> = {}
  readonly text: Record<string, TextTrack> = {}
  readonly metadata: Record<string, string> = {}
  /** Log time (ns) of t = 0; set once enough messages have arrived to tell the bulk from outliers. */
  origin: bigint | undefined
  /** Last message time seen. */
  duration = 0
  /** Last message time per the file summary, when there is one; lets a timeline show full length while loading. */
  summaryEnd: bigint | undefined
  /** Frame bytes held in memory. */
  frameBytes = 0
  /** True once frames were dropped and can't be fetched back (no index or no Range support). */
  framesLost = false
  version = 0

  #channels = new Map<number, Channel>()
  #byTopic = new Map<string, Channel>()
  #summaryCounts = new Set<string>()
  #pending: Pending[] = []
  #originSample: bigint[] = []
  #listeners = new Set<() => void>()
  #maxFrameBytes: number
  // Insertion order = recency; touched frames move to the end.
  #lru = new Map<Frame, ImageTrack>()
  #frameTime = new WeakMap<Frame, number>()
  #pinned = new Set<Frame>()
  // The last window asked for (the playhead's neighbourhood); its frames are released last.
  #focus: [number, number] | undefined
  #window: WindowReader | undefined
  #inflight: { topics: string[]; start: number; end: number; done: Promise<void> }[] = []
  #reads: Promise<void> = Promise.resolve()

  constructor(opts: { maxFrameBytes?: number; window?: WindowReader } = {}) {
    this.#maxFrameBytes = opts.maxFrameBytes ?? 512 * 2 ** 20
    this.#window = opts.window
  }

  /** Time the timeline should span: the summary's end when known, else what has loaded. */
  get length(): number {
    if (this.origin !== undefined && this.summaryEnd !== undefined && this.summaryEnd > this.origin) {
      return Math.max(this.duration, Number(this.summaryEnd - this.origin) / 1e9)
    }
    return this.duration
  }

  subscribe(fn: () => void) {
    this.#listeners.add(fn)
    return () => { this.#listeners.delete(fn) }
  }

  /** Notifies subscribers; loaders call it after each batch of messages. */
  commit() {
    this.version++
    for (const fn of this.#listeners) fn()
  }

  /** Registers a topic from the summary before any message arrives. */
  addTopic(topic: string, schema: string, encoding: string, count: number) {
    if (this.topics.has(topic)) return
    this.topics.set(topic, { topic, schema, encoding, count, kind: kindOfSchema(schema) })
    this.#summaryCounts.add(topic)
  }

  addChannel(id: number, topic: string, messageEncoding: string, schema: SchemaRecord | undefined) {
    // Writers may repeat Channel records (e.g. once per chunk).
    if (this.#channels.has(id)) return
    const schemaName = schema?.name ?? ''
    let info = this.topics.get(topic)
    if (!info) {
      info = { topic, schema: schemaName, encoding: messageEncoding, count: 0, kind: kindOfSchema(schemaName) }
      this.topics.set(topic, info)
    }
    const ch: Channel = { topic, info }
    if (info.kind !== 'other') {
      try {
        ch.decode = createDecoder(messageEncoding, schema)
        const key = schemaKey(schemaName)
        if (ENCODED_IMAGE.has(key)) ch.frame = encodedFrame
        else if (RAW_IMAGE.has(key)) ch.frame = rawFrame
      } catch (e) {
        info.kind = 'other'
        info.error = (e as Error).message
      }
    }
    this.#channels.set(id, ch)
    this.#byTopic.set(topic, ch)
  }

  addMessage(channelId: number, logTime: bigint, data: Uint8Array) {
    const ch = this.#channels.get(channelId)
    if (!ch) return
    if (!this.#summaryCounts.has(ch.topic)) ch.info.count++
    if (ch.info.kind === 'other') return
    if (this.origin === undefined) {
      this.#pending.push({ ch, logTime, data: data.slice() })
      if (this.#decideKind(ch, data) !== 'text') this.#originSample.push(logTime)
      if (this.#originSample.length >= ORIGIN_SAMPLE) this.#settleOrigin()
      return
    }
    this.#ingest(ch, logTime, data)
  }

  /** Call when the file has been read to the end. */
  finish() {
    if (this.origin === undefined) this.#settleOrigin()
    this.commit()
  }

  setMetadata(key: string, value: string) {
    this.metadata[key] = value
  }

  /** Seconds from origin for a log time. */
  timeOf(logTime: bigint): number {
    const o = this.origin ?? logTime
    return logTime < o ? 0 : Number(logTime - o) / 1e9
  }

  /** Frame `i` of an image track, marking it recently used. */
  frame(topic: string, i: number): Frame | undefined {
    const f = this.images[topic]?.frames[i]
    if (f) { this.#lru.delete(f); this.#lru.set(f, this.images[topic]) }
    return f
  }

  /** Can frames released under the budget be fetched again? */
  get refetchable() {
    return !!this.#window
  }

  /**
   * Brings frames of `topics` between t0 and t1 (seconds) into memory, reading only the chunks that hold them.
   * For video, reaches back to the keyframe. Skips what reads already in flight will bring, so calling it on every
   * playhead move costs one read per stretch of missing frames, not one per call.
   */
  async ensure(topics: string[], t0: number, t1: number, signal?: AbortSignal): Promise<void> {
    if (!this.#window || this.origin === undefined) return
    this.#focus = [t0 - 1, t1]
    let start = Infinity
    let end = -Infinity
    const need: string[] = []
    for (const topic of topics) {
      const tr = this.images[topic]
      if (!tr?.times.length) continue
      let first = Math.max(0, indexAt(tr.times, t0))
      const last = Math.max(0, indexAt(tr.times, t1))
      if (tr.kind === 'video') while (first > 0 && !tr.keys[first]) first--
      while (first <= last && tr.frames[first]) first++
      if (first > last) continue
      need.push(topic)
      start = Math.min(start, tr.times[first])
      end = Math.max(end, tr.times[last])
    }
    if (!need.length) return
    const waits: Promise<void>[] = []
    for (const r of [...this.#inflight].sort((a, b) => a.start - b.start)) {
      if (r.start <= start && r.end >= start && need.every((t) => r.topics.includes(t))) {
        start = r.end
        waits.push(r.done)
      }
    }
    if (start > end) return void (await Promise.all(waits))
    end = Math.max(end, start + MIN_WINDOW)
    await Promise.all([this.#read(need, start, end, signal), ...waits])
  }

  // One window read at a time, in request order: on a slow link the frames needed next shouldn't share
  // bandwidth with the lookahead.
  async #read(topics: string[], start: number, end: number, signal?: AbortSignal) {
    const done = this.#reads.then(() => this.#fetch(topics, start, end, signal))
    this.#reads = done.catch(() => {})
    const entry = { topics, start, end, done }
    this.#inflight.push(entry)
    try {
      await entry.done
    } finally {
      this.#inflight.splice(this.#inflight.indexOf(entry), 1)
    }
  }

  async #fetch(topics: string[], start: number, end: number, signal?: AbortSignal) {
    const ns = (t: number) => this.origin! + BigInt(Math.round(t * 1e9))
    const kept: Frame[] = []
    let shown = performance.now()
    try {
      for await (const m of this.#window!(topics, ns(start), ns(end), signal)) {
        const tr = this.images[m.topic]
        const ch = this.#byTopic.get(m.topic)
        if (!tr || !ch?.decode) continue
        const t = this.timeOf(m.logTime)
        // Equal timestamps happen; fill the first empty slot among them.
        let i = indexAt(tr.times, t)
        while (i > 0 && tr.times[i - 1] === t) i--
        while (i < tr.times.length && tr.times[i] === t && tr.frames[i]) i++
        if (tr.times[i] !== t) continue
        const frame = this.#toFrame(ch, tr, ch.decode(m.data) as Record<string, unknown>)
        if (!frame) continue
        // Pinned until the read ends, so a window bigger than the budget can't evict its own frames.
        this.#pinned.add(frame)
        kept.push(frame)
        this.#keep(tr, i, frame, t, true)
        // Pieces of a window land one by one; show frames as they do rather than when the whole window has.
        if (performance.now() - shown > 100) {
          shown = performance.now()
          this.commit()
        }
      }
    } finally {
      for (const f of kept) this.#pinned.delete(f)
      this.commit()
    }
  }

  #decideKind(ch: Channel, data: Uint8Array): TopicKind {
    if (ch.info.kind) return ch.info.kind
    try {
      const ex = extract(ch.decode!(data))
      ch.info.kind = ex.groups.length ? 'vector' : ex.strings.length === 1 ? 'text' : 'other'
    } catch (e) {
      ch.info.kind = 'other'
      ch.info.error = (e as Error).message
    }
    return ch.info.kind
  }

  // The earliest log time near the median of the first messages, so a few latched or mis-stamped
  // messages (seconds since boot vs since epoch) can't stretch the timeline across decades.
  #settleOrigin() {
    const sample = this.#originSample.length ? this.#originSample : this.#pending.map((p) => p.logTime)
    if (!sample.length) return
    const sorted = [...sample].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    const median = sorted[sorted.length >> 1]
    this.origin = sorted.find((t) => t >= median - ORIGIN_WINDOW) ?? median
    const pending = this.#pending
    this.#pending = []
    this.#originSample = []
    for (const p of pending) this.#ingest(p.ch, p.logTime, p.data)
  }

  #ingest(ch: Channel, logTime: bigint, data: Uint8Array) {
    const kind = this.#decideKind(ch, data)
    if (kind === 'other') return
    const t = this.timeOf(logTime)
    let msg: Record<string, unknown>
    try {
      msg = ch.decode!(data) as Record<string, unknown>
    } catch (e) {
      ch.info.error ??= (e as Error).message
      return
    }
    if (kind === 'image' || kind === 'video') this.#addFrame(ch, kind, t, msg)
    else if (kind === 'text') this.#addText(ch, t, msg)
    else this.#addVectors(ch, t, msg)
    if (t > this.duration) this.duration = t
  }

  #toFrame(ch: Channel, tr: ImageTrack, msg: Record<string, unknown>): Frame | undefined {
    if (tr.kind === 'video') {
      const data = msg.data as Uint8Array | undefined
      return data?.length ? { kind: 'video', data: data.slice() } : undefined
    }
    return ch.frame?.(msg)
  }

  #addFrame(ch: Channel, kind: 'image' | 'video', t: number, msg: Record<string, unknown>) {
    const tr = (this.images[ch.topic] ??= { topic: ch.topic, kind, times: [], frames: [], keys: [] })
    if (kind === 'video') tr.format ??= String(msg.format ?? '').toLowerCase()
    const frame = this.#toFrame(ch, tr, msg)
    const key = kind === 'video' && !!frame && isKeyframe(tr.format!, frame.data)
    const i = insertionPoint(tr.times, t)
    tr.times.splice(i, 0, t)
    tr.frames.splice(i, 0, undefined)
    tr.keys.splice(i, 0, key)
    if (frame) this.#keep(tr, i, frame, t, false)
  }

  // Over budget: with an index, release the least recently used frames outside the playhead's window (fetched
  // back on demand); without one, stop keeping new frames instead, since released ones could never return.
  #keep(tr: ImageTrack, i: number, frame: Frame, t: number, fetched: boolean) {
    const size = frame.data.byteLength
    if (this.frameBytes + size > this.#maxFrameBytes && !this.#window && !fetched) {
      this.framesLost = true
      return
    }
    tr.frames[i] = frame
    this.#frameTime.set(frame, t)
    this.#lru.set(frame, tr)
    this.frameBytes += size
    const focus = this.#focus
    for (const [old, otr] of this.#lru) {
      if (this.frameBytes <= this.#maxFrameBytes) break
      const ot = this.#frameTime.get(old)!
      if (old === frame || this.#pinned.has(old) || (focus && ot >= focus[0] && ot <= focus[1])) continue
      this.#release(old, otr)
    }
  }

  #release(frame: Frame, tr: ImageTrack) {
    this.#lru.delete(frame)
    this.frameBytes -= frame.data.byteLength
    const t = this.#frameTime.get(frame)!
    let i = indexAt(tr.times, t)
    while (i >= 0 && tr.times[i] === t && tr.frames[i] !== frame) i--
    if (i >= 0 && tr.frames[i] === frame) tr.frames[i] = undefined
  }

  #addText(ch: Channel, t: number, msg: Record<string, unknown>) {
    const value = extract(msg).strings[0] ?? ''
    if (value.length > LONG_TEXT) {
      this.metadata[ch.topic] ??= value
      return
    }
    const tr = (this.text[ch.topic] ??= { topic: ch.topic, times: [], values: [] })
    const i = insertionPoint(tr.times, t)
    tr.times.splice(i, 0, t)
    tr.values.splice(i, 0, value)
  }

  #addVectors(ch: Channel, t: number, msg: Record<string, unknown>) {
    for (const g of extract(msg).groups) {
      const key = g.path ? `${ch.topic}/${g.path}` : ch.topic
      const tr = (this.vectors[key] ??= { topic: ch.topic, times: [], dim: g.values.length, names: g.names, data: [] })
      const row = Array.from({ length: tr.dim }, (_, d) => (d < g.values.length ? Number(g.values[d]) : NaN))
      const i = insertionPoint(tr.times, t)
      tr.times.splice(i, 0, t)
      if (i === tr.times.length - 1) tr.data.push(...row)
      else tr.data.splice(i * tr.dim, 0, ...row)
    }
  }
}
