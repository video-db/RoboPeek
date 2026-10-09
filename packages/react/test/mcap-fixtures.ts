import { Recording } from '@videodb/robopeek-mcap'

const enc = new TextEncoder()
const SEC = 1_000_000_000n

/** JSON topics only: /state {a, b} at 10 Hz for 2 s (t = 0 … 1.9) and a /task instruction. */
export function makeRecording(label = 'task') {
  const rec = new Recording()
  rec.addChannel(1, '/state', 'json', undefined)
  rec.addChannel(2, '/task', 'json', undefined)
  const t0 = 1_700_000_000n * SEC
  rec.addMessage(2, t0, enc.encode(JSON.stringify({ data: label })))
  for (let i = 0; i < 20; i++) rec.addMessage(1, t0 + (BigInt(i) * SEC) / 10n, enc.encode(JSON.stringify({ a: i, b: -i })))
  rec.finish()
  return rec
}

/** A real 4×4 PNG, so frames decode in the browser. */
export async function pngBytes(color = '#ec5b16') {
  const canvas = new OffscreenCanvas(4, 4)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 4, 4)
  return new Uint8Array(await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer())
}
