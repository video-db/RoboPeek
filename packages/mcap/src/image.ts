export type Frame =
  | { kind: 'encoded'; mime: string; data: Uint8Array }
  | { kind: 'raw'; width: number; height: number; encoding: string; step: number; bigEndian: boolean; data: Uint8Array }
  | { kind: 'video'; data: Uint8Array }

export function sniffImage(b: Uint8Array): string | undefined {
  if (b.length < 4) return
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) return 'image/webp'
}

type Fields = Record<string, unknown>

/** CompressedImage (ROS or Foxglove). The bytes decide the type; `format` strings like "rgb8; jpeg compressed bgr8" vary. */
export function encodedFrame(m: Fields): Frame | undefined {
  const data = m.data as Uint8Array | undefined
  if (!data?.length) return
  const format = String(m.format ?? '').toLowerCase()
  const mime = sniffImage(data) ?? (format.includes('png') ? 'image/png' : format.includes('webp') ? 'image/webp' : 'image/jpeg')
  return { kind: 'encoded', mime, data: data.slice() }
}

export function rawFrame(m: Fields): Frame | undefined {
  const data = m.data as Uint8Array | undefined
  const width = Number(m.width)
  const height = Number(m.height)
  if (!data?.length || !width || !height) return
  const step = Number(m.step) || data.length / height
  return { kind: 'raw', width, height, encoding: String(m.encoding ?? ''), step, bigEndian: !!m.is_bigendian, data: data.slice() }
}

const CHANNELS: Record<string, [channels: number, bytes: number, bgr?: boolean]> = {
  rgb8: [3, 1], rgba8: [4, 1], bgr8: [3, 1, true], bgra8: [4, 1, true], mono8: [1, 1], '8uc1': [1, 1], '8uc3': [3, 1, true],
  '8uc4': [4, 1, true], mono16: [1, 2], '16uc1': [1, 2], '16sc1': [1, 2], '32fc1': [1, 4], '64fc1': [1, 8],
  rgb16: [3, 2], rgba16: [4, 2], bgr16: [3, 2, true], bgra16: [4, 2, true],
}

export function rawFormatSupported(encoding: string) {
  return encoding.toLowerCase() in CHANNELS
}

/**
 * RGBA pixels for a raw frame. Single-channel images wider than 8 bits (depth) are scaled to `range`, or to the
 * frame's own finite min/max when omitted.
 */
export function rawToRGBA(f: Extract<Frame, { kind: 'raw' }>, range?: [number, number]): Uint8ClampedArray<ArrayBuffer> {
  const spec = CHANNELS[f.encoding.toLowerCase()]
  if (!spec) throw new Error(`Unsupported image encoding "${f.encoding}"`)
  const [c, bytes, bgr] = spec
  const { width: w, height: h, step } = f
  const view = new DataView(f.data.buffer, f.data.byteOffset, f.data.byteLength)
  const little = !f.bigEndian
  const enc = f.encoding.toLowerCase()
  const read = (o: number) =>
    bytes === 1 ? view.getUint8(o)
    : bytes === 2 ? (enc === '16sc1' ? view.getInt16(o, little) : view.getUint16(o, little))
    : bytes === 4 ? view.getFloat32(o, little)
    : view.getFloat64(o, little)

  const out = new Uint8ClampedArray(w * h * 4)
  if (c === 1) {
    let [lo, hi] = range ?? [Infinity, -Infinity]
    if (!range) {
      if (bytes === 1) [lo, hi] = [0, 255]
      else for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = read(y * step + x * bytes)
        if (!Number.isFinite(v) || v === 0) continue
        if (v < lo) lo = v
        if (v > hi) hi = v
      }
    }
    const scale = hi > lo ? 255 / (hi - lo) : 0
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = read(y * step + x * bytes)
      const o = (y * w + x) * 4
      out[o] = out[o + 1] = out[o + 2] = Number.isFinite(v) ? (v - lo) * scale : 0
      out[o + 3] = 255
    }
    return out
  }
  const shift = bytes === 2 ? 1 / 257 : 1
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * step + x * c * bytes
    const o = (y * w + x) * 4
    const r = read(i) * shift
    const g = read(i + bytes) * shift
    const b = read(i + 2 * bytes) * shift
    out[o] = bgr ? b : r
    out[o + 1] = g
    out[o + 2] = bgr ? r : b
    out[o + 3] = c === 4 ? read(i + 3 * bytes) * shift : 255
  }
  return out
}

/** 16-bit greyscale PNG (how depth is usually stored). Browsers decode these to 8 bits, so we decode them ourselves. */
export function isPng16Gray(b: Uint8Array) {
  return sniffImage(b) === 'image/png' && b[24] === 16 && b[25] === 0 && b[28] === 0
}

const paeth = (a: number, b: number, c: number) => {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
}

/** A 16-bit greyscale PNG as a raw `16UC1` frame (big-endian, as PNG stores it). Needs `DecompressionStream`. */
export async function decodePng16(png: Uint8Array): Promise<Extract<Frame, { kind: 'raw' }>> {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const width = view.getUint32(16)
  const height = view.getUint32(20)
  const idat: Uint8Array<ArrayBuffer>[] = []
  for (let off = 8; off + 8 <= png.length; ) {
    const len = view.getUint32(off)
    const type = String.fromCharCode(png[off + 4], png[off + 5], png[off + 6], png[off + 7])
    if (type === 'IDAT') idat.push(png.slice(off + 8, off + 8 + len))
    if (type === 'IEND') break
    off += 12 + len
  }
  const inflated = new Uint8Array(await new Response(new Blob(idat).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer())
  const step = width * 2
  const out = new Uint8Array(height * step)
  for (let y = 0; y < height; y++) {
    const filter = inflated[y * (step + 1)]
    const line = inflated.subarray(y * (step + 1) + 1, (y + 1) * (step + 1))
    const row = y * step
    for (let x = 0; x < step; x++) {
      const a = x >= 2 ? out[row + x - 2] : 0
      const b = y ? out[row - step + x] : 0
      const c = x >= 2 && y ? out[row - step + x - 2] : 0
      const pred = filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1 : filter === 4 ? paeth(a, b, c) : 0
      out[row + x] = (line[x] + pred) & 0xff
    }
  }
  return { kind: 'raw', width, height, encoding: '16UC1', step, bigEndian: true, data: out }
}
