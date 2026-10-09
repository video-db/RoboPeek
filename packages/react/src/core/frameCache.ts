// Bitmap cache with lookahead, for adapters building ImageTrack.load. Holds the last `size` decoded frames.

export type FrameCacheOptions = {
  /** Frames decoded past the one asked for, so playback doesn't wait on decoding. */
  ahead?: number
  size?: number
  /** Number of frames (it may grow while loading). */
  count: () => number
}

/**
 * `decode(i)` returns the bitmap for frame i, or undefined when its bytes aren't available yet (not cached, so a
 * later call retries). Returns a `load` for ImageTrack and a `close` that releases every bitmap.
 */
export function frameCache(decode: (i: number) => Promise<ImageBitmap> | undefined, { ahead = 8, size = 32, count }: FrameCacheOptions) {
  const cache = new Map<number, Promise<ImageBitmap>>()
  const get = (i: number) => {
    let p = cache.get(i)
    if (!p) {
      p = decode(i)
      if (!p) return undefined
      cache.set(i, p)
      p.catch(() => cache.delete(i))
      if (cache.size > size) {
        const [oldest, old] = cache.entries().next().value!
        cache.delete(oldest)
        old.then((b) => b.close(), () => {})
      }
    }
    return p
  }
  return {
    load: (i: number): Promise<ImageBitmap | undefined> => {
      const p = get(i)
      for (let j = i + 1; j <= Math.min(count() - 1, i + ahead); j++) get(j)?.catch(() => {})
      return p ?? Promise.resolve(undefined)
    },
    close: () => {
      for (const p of cache.values()) p.then((b) => b.close(), () => {})
      cache.clear()
    },
  }
}
