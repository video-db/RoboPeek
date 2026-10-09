import { useEffect, useMemo, useRef, useState, type ComponentPropsWithRef } from 'react'
import { indexAt, rawToRGBA, decodePng16, isPng16Gray, MissingFramesError, VideoTrackDecoder, type Frame, type ImageTrack, type Recording } from '@videodb/robopeek-mcap'
import { cx } from './cx.ts'

const PREFETCH = 8
const CACHE = 32

export type FrameViewProps = Omit<ComponentPropsWithRef<'figure'>, 'children'> & {
  recording: Recording
  track: ImageTrack
  /** Seconds; shows the latest frame at or before it. */
  time: number
  /** Recording version; a change re-checks frames that were not in memory. */
  version?: number
}

async function bitmap(f: Frame): Promise<ImageBitmap> {
  // 16-bit depth PNGs would decode to their top 8 bits (near black); scale the full range instead.
  if (f.kind === 'encoded' && isPng16Gray(f.data) && typeof DecompressionStream !== 'undefined') f = await decodePng16(f.data)
  if (f.kind === 'encoded') return createImageBitmap(new Blob([f.data as Uint8Array<ArrayBuffer>], { type: f.mime }))
  if (f.kind === 'raw') return createImageBitmap(new ImageData(rawToRGBA(f), f.width, f.height))
  throw new Error('video frames go through VideoTrackDecoder')
}

const labelOf = (f: Frame) => (f.kind === 'encoded' ? (isPng16Gray(f.data) ? 'png 16-bit' : f.mime.split('/')[1]) : f.kind === 'raw' ? f.encoding : '')

type Drawable = ImageBitmap | VideoFrame
const sizeOf = (d: Drawable): [number, number] => ('displayWidth' in d ? [d.displayWidth, d.displayHeight] : [d.width, d.height])

/**
 * One camera topic. Images decode to bitmaps on demand (plus a lookahead); video decodes forward from the nearest
 * keyframe. While a frame is not in memory the last one stays up, marked `data-pending`.
 */
export function FrameView({ recording, track, time, version, className, ...rest }: FrameViewProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const cache = useRef(new Map<number, Promise<ImageBitmap>>())
  const [size, setSize] = useState<[number, number] | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  const i = Math.max(0, indexAt(track.times, time))
  // Kept from the last frame seen, so the caption doesn't change while a frame is out of memory.
  const label = useRef('')
  const current = track.frames[i]
  if (current) label.current = track.kind === 'video' ? track.format ?? '' : labelOf(current)

  const video = useMemo(() => {
    if (track.kind !== 'video' || !VideoTrackDecoder.supported()) return undefined
    return new VideoTrackDecoder({
      format: track.format ?? '',
      get length() { return track.times.length },
      keyframe: (j) => track.keys[j],
      data: (j) => recording.frame(track.topic, j)?.data,
    })
  }, [recording, track])
  useEffect(() => () => video?.close(), [video])

  useEffect(() => {
    const c = cache.current
    return () => {
      for (const p of c.values()) p.then((b) => b.close(), () => {})
      c.clear()
    }
  }, [track])

  useEffect(() => {
    let live = true
    const draw = (d: Drawable | undefined) => {
      const el = canvas.current
      if (!live || !el || !d) return
      const [w, h] = sizeOf(d)
      if (el.width !== w || el.height !== h) {
        el.width = w
        el.height = h
        setSize([w, h])
      }
      el.getContext('2d')!.drawImage(d, 0, 0)
      setPending(false)
      setError(undefined)
    }
    const fail = (e: unknown) => {
      if (!live) return
      if (e instanceof MissingFramesError) setPending(true)
      else setError((e as Error).message)
    }

    if (track.kind === 'video') {
      if (!video) setError('This browser has no WebCodecs video decoder.')
      else video.frameAt(i).then(draw, fail)
      return () => { live = false }
    }

    const get = (j: number) => {
      let p = cache.current.get(j)
      if (!p) {
        const f = recording.frame(track.topic, j)
        if (!f) return undefined
        p = bitmap(f)
        cache.current.set(j, p)
        if (cache.current.size > CACHE) {
          const [oldest, old] = cache.current.entries().next().value!
          cache.current.delete(oldest)
          old.then((b) => b.close(), () => {})
        }
      }
      return p
    }
    const p = get(i)
    if (p) p.then(draw, fail)
    else setPending(true)
    for (let j = i + 1; j <= Math.min(track.times.length - 1, i + PREFETCH); j++) get(j)?.catch(() => {})
    return () => { live = false }
  }, [recording, track, video, i, version])

  return (
    <figure className={cx('rp-frame', className)} data-kind={track.kind} data-pending={pending || undefined} {...rest}>
      <canvas ref={canvas} aria-label={`${track.topic}, frame ${i}`} />
      <figcaption>
        <span>{track.topic}</span>
        {error ? <span data-tone="error">{error}</span> : size && <span className="rp-mono">{size[0]}×{size[1]} · {label.current}</span>}
      </figcaption>
    </figure>
  )
}
