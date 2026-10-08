import { useEffect, useMemo, useRef, useState, type ComponentPropsWithRef } from 'react'
import type { ImageTrack } from '@rlds-viewer/core'
import { cx } from './cx.ts'

const PREFETCH = 8

export type FrameCanvasProps = Omit<ComponentPropsWithRef<'figure'>, 'children'> & {
  name: string
  track: ImageTrack
  step: number
}

type Raw = Extract<ImageTrack, { kind: 'raw' }>

// Single-channel tensors (depth) are scaled to the track's own finite min/max; colour tensors assume 0–1 or 0–255.
function rawRange(t: Raw): [number, number] {
  let lo = Infinity
  let hi = -Infinity
  for (const v of t.data) {
    if (!Number.isFinite(v)) continue
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  return lo < hi ? [lo, hi] : [0, 1]
}

function rawFrame(t: Raw, i: number, [lo, hi]: [number, number]): Promise<ImageBitmap> {
  const [h, w, c] = t.shape
  const off = i * h * w * c
  const img = new ImageData(w, h)
  const d = img.data
  const scale = c === 1 ? 255 / (hi - lo) : hi <= 1 ? 255 : 1
  for (let p = 0; p < h * w; p++) {
    const o = p * 4
    if (c === 1) {
      const v = t.data[off + p]
      d[o] = d[o + 1] = d[o + 2] = Number.isFinite(v) ? (v - lo) * scale : 0
    } else {
      d[o] = t.data[off + p * c] * scale
      d[o + 1] = t.data[off + p * c + 1] * scale
      d[o + 2] = t.data[off + p * c + 2] * scale
    }
    d[o + 3] = 255
  }
  return createImageBitmap(img)
}

/** Decodes frames to ImageBitmaps on demand (plus a lookahead) so playback never flashes. */
export function FrameCanvas({ name, track, step, className, ...rest }: FrameCanvasProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const cache = useRef(new Map<number, Promise<ImageBitmap>>())
  const [size, setSize] = useState<[number, number] | null>(null)
  const range = useMemo(() => (track.kind === 'raw' ? rawRange(track) : undefined), [track])
  const count = track.kind === 'encoded' ? track.frames.length : track.data.length / (track.shape[0] * track.shape[1] * track.shape[2])

  useEffect(() => {
    const c = cache.current
    return () => {
      for (const p of c.values()) p.then((b) => b.close(), () => {})
      c.clear()
    }
  }, [track])

  useEffect(() => {
    const get = (i: number) => {
      let p = cache.current.get(i)
      if (!p) {
        p = track.kind === 'encoded'
          ? createImageBitmap(new Blob([track.frames[i] as Uint8Array<ArrayBuffer>], { type: track.mime }))
          : rawFrame(track, i, range!)
        cache.current.set(i, p)
      }
      return p
    }
    let live = true
    get(step).then((bmp) => {
      const el = canvas.current
      if (!live || !el) return
      if (el.width !== bmp.width || el.height !== bmp.height) {
        el.width = bmp.width
        el.height = bmp.height
        setSize([bmp.width, bmp.height])
      }
      el.getContext('2d')!.drawImage(bmp, 0, 0)
    }, () => {})
    for (let i = step + 1; i <= Math.min(count - 1, step + PREFETCH); i++) get(i).catch(() => {})
    return () => { live = false }
  }, [track, step, range, count])

  return (
    <figure className={cx('rlds-frame', className)} data-kind={track.kind} {...rest}>
      <canvas ref={canvas} aria-label={`${name}, step ${step}`} />
      <figcaption>
        <span>{name}</span>
        {size && <span className="rlds-mono">{size[0]}×{size[1]} · {track.kind === 'encoded' ? track.mime.split('/')[1] : 'raw'}</span>}
      </figcaption>
    </figure>
  )
}
