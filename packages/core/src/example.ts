// Minimal protobuf decoder for tf.train.Example — no schema compiler needed.

export type Feature =
  | { kind: 'bytes'; values: Uint8Array[] }
  | { kind: 'float'; values: Float32Array }
  | { kind: 'int64'; values: Float64Array }

class Reader {
  buf: Uint8Array
  pos: number
  end: number

  constructor(buf: Uint8Array, pos = 0, end = buf.length) {
    this.buf = buf
    this.pos = pos
    this.end = end
  }

  get done() {
    return this.pos >= this.end
  }

  // Doubles instead of bit ops: values above 2^53 lose precision, which is fine for RLDS fields.
  varint(): number {
    let r = 0
    let m = 1
    let c: number
    do {
      c = this.buf[this.pos++]
      r += (c & 0x7f) * m
      m *= 128
    } while (c & 0x80)
    return r
  }

  bytes(): Uint8Array {
    const n = this.varint()
    const out = this.buf.subarray(this.pos, this.pos + n)
    this.pos += n
    return out
  }

  sub(): Reader {
    const n = this.varint()
    const r = new Reader(this.buf, this.pos, this.pos + n)
    this.pos += n
    return r
  }

  skip(wire: number) {
    if (wire === 0) this.varint()
    else if (wire === 1) this.pos += 8
    else if (wire === 2) this.pos += this.varint()
    else if (wire === 5) this.pos += 4
    else throw new Error(`Unsupported protobuf wire type ${wire}`)
  }
}

const toInt64 = (u: number) => (u >= 2 ** 63 ? u - 2 ** 64 : u)

function floatList(r: Reader): Float32Array {
  const out: number[] = []
  while (!r.done) {
    const tag = r.varint()
    if (tag >> 3 !== 1) { r.skip(tag & 7); continue }
    if ((tag & 7) === 2) {
      const b = r.bytes()
      const v = new DataView(b.buffer, b.byteOffset, b.byteLength)
      for (let i = 0; i < b.byteLength; i += 4) out.push(v.getFloat32(i, true))
    } else {
      out.push(new DataView(r.buf.buffer, r.buf.byteOffset + r.pos, 4).getFloat32(0, true))
      r.pos += 4
    }
  }
  return Float32Array.from(out)
}

function int64List(r: Reader): Float64Array {
  const out: number[] = []
  while (!r.done) {
    const tag = r.varint()
    if (tag >> 3 !== 1) { r.skip(tag & 7); continue }
    if ((tag & 7) === 2) {
      const p = r.sub()
      while (!p.done) out.push(toInt64(p.varint()))
    } else out.push(toInt64(r.varint()))
  }
  return Float64Array.from(out)
}

function bytesList(r: Reader): Uint8Array[] {
  const out: Uint8Array[] = []
  while (!r.done) {
    const tag = r.varint()
    if (tag >> 3 === 1) out.push(r.bytes())
    else r.skip(tag & 7)
  }
  return out
}

function feature(r: Reader): Feature {
  while (!r.done) {
    const tag = r.varint()
    const field = tag >> 3
    if (field === 1) return { kind: 'bytes', values: bytesList(r.sub()) }
    if (field === 2) return { kind: 'float', values: floatList(r.sub()) }
    if (field === 3) return { kind: 'int64', values: int64List(r.sub()) }
    r.skip(tag & 7)
  }
  return { kind: 'bytes', values: [] }
}

const utf8 = new TextDecoder()

/** Example { Features features = 1 } → Features { map<string, Feature> feature = 1 } */
export function decodeExample(buf: Uint8Array): Map<string, Feature> {
  const out = new Map<string, Feature>()
  const ex = new Reader(buf)
  while (!ex.done) {
    const tag = ex.varint()
    if (tag >> 3 !== 1) { ex.skip(tag & 7); continue }
    const feats = ex.sub()
    while (!feats.done) {
      const ftag = feats.varint()
      if (ftag >> 3 !== 1) { feats.skip(ftag & 7); continue }
      const entry = feats.sub()
      let key = ''
      let value: Feature = { kind: 'bytes', values: [] }
      while (!entry.done) {
        const etag = entry.varint()
        if (etag >> 3 === 1) key = utf8.decode(entry.bytes())
        else if (etag >> 3 === 2) value = feature(entry.sub())
        else entry.skip(etag & 7)
      }
      out.set(key, value)
    }
  }
  return out
}
