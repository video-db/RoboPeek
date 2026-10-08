import { useEffect, useRef, useState } from 'react'
import type { ImageTrack } from '@rlds-viewer/core'

const PREFETCH = 8

/** Decodes frames to ImageBitmaps on demand (plus a lookahead) so playback never flashes. */
export function FrameCanvas({ name, track, step }: { name: string; track: ImageTrack; step: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const cache = useRef(new Map<number, Promise<ImageBitmap>>())
  const [size, setSize] = useState<[number, number] | null>(null)

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
        p = createImageBitmap(new Blob([track.frames[i] as Uint8Array<ArrayBuffer>], { type: track.mime }))
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
    for (let i = step + 1; i <= Math.min(track.frames.length - 1, step + PREFETCH); i++) get(i).catch(() => {})
    return () => { live = false }
  }, [track, step])

  return (
    <figure className="frame">
      <canvas ref={canvas} aria-label={`${name}, step ${step}`} />
      <figcaption>
        <span>{name}</span>
        {size && <span className="mono">{size[0]}×{size[1]} · {track.mime.split('/')[1]}</span>}
      </figcaption>
    </figure>
  )
}
