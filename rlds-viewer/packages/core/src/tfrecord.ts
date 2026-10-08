// TFRecord framing: u64 length | u32 masked crc | data | u32 masked crc. CRCs are not verified.

class ByteQueue {
  private chunks: Uint8Array[] = []
  private head = 0
  length = 0

  push(chunk: Uint8Array) {
    this.chunks.push(chunk)
    this.length += chunk.length
  }

  // Zero-copy when the bytes sit inside one chunk; copies across chunk boundaries.
  take(n: number): Uint8Array {
    const first = this.chunks[0]
    if (first.length - this.head >= n) {
      const out = first.subarray(this.head, this.head + n)
      this.advance(n)
      return out
    }
    const out = new Uint8Array(n)
    let off = 0
    while (off < n) {
      const c = this.chunks[0]
      const k = Math.min(c.length - this.head, n - off)
      out.set(c.subarray(this.head, this.head + k), off)
      off += k
      this.advance(k)
    }
    return out
  }

  private advance(n: number) {
    this.head += n
    this.length -= n
    if (this.head === this.chunks[0].length) {
      this.chunks.shift()
      this.head = 0
    }
  }
}

export function readU64(b: Uint8Array): number {
  const v = new DataView(b.buffer, b.byteOffset, 8)
  return v.getUint32(0, true) + v.getUint32(4, true) * 2 ** 32
}

/** Yields each record's payload as soon as its bytes have arrived. */
export async function* readRecords(
  stream: ReadableStream<Uint8Array>,
  onBytes?: (n: number) => void,
): AsyncGenerator<Uint8Array> {
  const reader = stream.getReader()
  const q = new ByteQueue()
  let len: number | undefined
  try {
    for (;;) {
      for (;;) {
        if (len === undefined) {
          if (q.length < 12) break
          len = readU64(q.take(12))
        }
        if (q.length < len + 4) break
        const rec = q.take(len)
        q.take(4)
        len = undefined
        yield rec
      }
      const { value, done } = await reader.read()
      if (done) break
      q.push(value)
      onBytes?.(value.length)
    }
    if (len !== undefined || q.length > 0) throw new Error('File ends mid-record: it is truncated or not a TFRecord file.')
  } finally {
    reader.cancel().catch(() => {})
  }
}
