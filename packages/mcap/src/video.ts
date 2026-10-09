// foxglove.CompressedVideo carries Annex B H.264 (one access unit per message). WebCodecs decodes it, so this
// part only runs where `VideoDecoder` exists (browsers); parsing helpers work anywhere.

/** NAL unit types in an Annex B buffer. */
function* nalUnits(b: Uint8Array, hevc: boolean) {
  for (let i = 0; i + 3 < b.length; i++) {
    if (b[i] === 0 && b[i + 1] === 0 && b[i + 2] === 1) {
      yield { type: hevc ? (b[i + 3] >> 1) & 0x3f : b[i + 3] & 0x1f, at: i + 3 }
      i += 2
    }
  }
}

const isHevc = (format: string) => format === 'h265' || format === 'hevc'

export function isKeyframe(format: string, data: Uint8Array): boolean {
  const hevc = isHevc(format)
  for (const n of nalUnits(data, hevc)) if (hevc ? n.type >= 16 && n.type <= 21 : n.type === 5) return true
  return false
}

const hex = (n: number) => n.toString(16).padStart(2, '0')

/** WebCodecs codec string from the first keyframe's SPS; undefined for formats we don't decode. */
export function codecString(format: string, keyframe: Uint8Array): string | undefined {
  if (format !== 'h264') return
  for (const n of nalUnits(keyframe, false)) {
    if (n.type === 7 && n.at + 3 < keyframe.length) return `avc1.${hex(keyframe[n.at + 1])}${hex(keyframe[n.at + 2])}${hex(keyframe[n.at + 3])}`
  }
}

export class MissingFramesError extends Error {
  constructor() {
    super('Video frames are not in memory yet.')
  }
}

export type VideoSource = {
  format: string
  length: number
  keyframe(i: number): boolean
  /** Frame bytes, or undefined when not in memory. */
  data(i: number): Uint8Array | undefined
}

// Fed past the target so a decoder holding frames for reordering (B-frames) still emits it.
const LOOKAHEAD = 16
const CACHE = 48
const TIMEOUT = 3000

/**
 * Random access into one video track: decodes forward from the nearest keyframe, keeps decoding forward while
 * playback moves on, and caches recent frames. Returned frames are owned by the decoder; draw them right away.
 */
export class VideoTrackDecoder {
  #src: VideoSource
  #decoder: VideoDecoder | undefined
  #codec: string | undefined
  #start = 0
  #next = 0
  #frames = new Map<number, VideoFrame>()
  #waiters = new Map<number, { resolve: () => void; reject: (e: unknown) => void }>()
  #queue: Promise<unknown> = Promise.resolve()
  #gen = 0

  constructor(src: VideoSource) {
    this.#src = src
  }

  static supported() {
    return typeof VideoDecoder !== 'undefined'
  }

  /** The decoded frame at `i`, or undefined when a newer request superseded this one. */
  frameAt(i: number): Promise<VideoFrame | undefined> {
    const gen = ++this.#gen
    const run = this.#queue.then(() => (gen === this.#gen ? this.#decodeTo(i) : undefined))
    this.#queue = run.catch(() => {})
    return run
  }

  close() {
    this.#gen++
    this.#reset()
    this.#decoder?.close()
    this.#decoder = undefined
  }

  #keyBefore(i: number) {
    for (let k = i; k >= 0; k--) if (this.#src.keyframe(k)) return k
    return -1
  }

  #reset() {
    for (const f of this.#frames.values()) f.close()
    this.#frames.clear()
    for (const w of this.#waiters.values()) w.reject(new Error('reset'))
    this.#waiters.clear()
    if (this.#decoder?.state === 'configured') this.#decoder.reset()
  }

  async #ensureDecoder(key: number) {
    if (!this.#codec) {
      const data = this.#src.data(key)
      if (!data) throw new MissingFramesError()
      this.#codec = codecString(this.#src.format, data)
      if (!this.#codec) throw new Error(`Unsupported video format "${this.#src.format}".`)
      const { supported } = await VideoDecoder.isConfigSupported({ codec: this.#codec })
      if (!supported) throw new Error(`This browser cannot decode ${this.#codec}.`)
    }
    if (!this.#decoder || this.#decoder.state === 'closed') {
      this.#decoder = new VideoDecoder({
        output: (f) => this.#output(f),
        error: (e) => {
          for (const w of this.#waiters.values()) w.reject(e)
          this.#waiters.clear()
        },
      })
    }
    if (this.#decoder.state !== 'configured') this.#decoder.configure({ codec: this.#codec, optimizeForLatency: true })
  }

  #output(f: VideoFrame) {
    const i = f.timestamp
    this.#frames.get(i)?.close()
    this.#frames.set(i, f)
    if (this.#frames.size > CACHE) {
      const oldest = Math.min(...this.#frames.keys())
      this.#frames.get(oldest)!.close()
      this.#frames.delete(oldest)
    }
    for (const [j, w] of this.#waiters) if (j <= i) { this.#waiters.delete(j); w.resolve() }
  }

  async #decodeTo(i: number): Promise<VideoFrame | undefined> {
    const cached = this.#frames.get(i)
    if (cached) return cached
    const key = this.#keyBefore(i)
    if (key < 0) throw new Error('No keyframe before this frame.')
    // Continue the running decode only when no keyframe lies between it and the target.
    if (!(this.#decoder?.state === 'configured' && i >= this.#next && key < this.#next && this.#start <= key)) {
      this.#reset()
      await this.#ensureDecoder(key)
      this.#start = this.#next = key
    }
    const dec = this.#decoder!
    const last = Math.min(this.#src.length - 1, i + LOOKAHEAD)
    let flush = last === this.#src.length - 1
    for (let j = this.#next; j <= last; j++) {
      const data = this.#src.data(j)
      if (!data) {
        if (j <= i) throw new MissingFramesError()
        flush = true
        break
      }
      dec.decode(new EncodedVideoChunk({ type: this.#src.keyframe(j) ? 'key' : 'delta', timestamp: j, data }))
      this.#next = j + 1
    }
    const ready = new Promise<void>((resolve, reject) => this.#waiters.set(i, { resolve, reject }))
    if (flush) {
      // flush() emits everything but makes the decoder require a keyframe next, so restart on the next call.
      await dec.flush()
      this.#next = this.#src.length
    }
    let timer = 0
    await Promise.race([ready, new Promise<void>((_, reject) => { timer = setTimeout(() => reject(new Error('Video decode timed out.')), TIMEOUT) as unknown as number })])
      .finally(() => clearTimeout(timer))
    return this.#frames.get(i) ?? this.#nearest(i)
  }

  // A decoder may drop a frame; show the closest earlier one rather than nothing.
  #nearest(i: number) {
    let best: number | undefined
    for (const j of this.#frames.keys()) if (j <= i && (best === undefined || j > best)) best = j
    return best === undefined ? undefined : this.#frames.get(best)
  }
}
