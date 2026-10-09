import { useEffect, useRef, useState, type ComponentPropsWithRef } from 'react'
import { indexAt, type ImageTrack } from './timeline.ts'
import { cx } from './cx.ts'

export type FrameViewProps = Omit<ComponentPropsWithRef<'figure'>, 'children'> & {
  name: string
  track: ImageTrack
  /** Shows the latest frame at or before this position. */
  position: number
  /** Timeline version; a change retries a frame that wasn't available. */
  version?: number
}

type Drawable = CanvasImageSource & { width?: number; height?: number; displayWidth?: number; displayHeight?: number }
const sizeOf = (d: Drawable): [number, number] => [Number(d.displayWidth ?? d.width), Number(d.displayHeight ?? d.height)]

/** One camera. Draws whatever the track loads; while a frame isn't available the last one stays up, marked `data-pending`. */
export function FrameView({ name, track, position, version, className, ...rest }: FrameViewProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState<[number, number] | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  const i = Math.max(0, indexAt(track.times, position))

  useEffect(() => {
    let live = true
    track.load(i).then(
      (d) => {
        const el = canvas.current
        if (!live || !el) return
        if (!d) return setPending(true)
        const [w, h] = sizeOf(d as Drawable)
        if (el.width !== w || el.height !== h) {
          el.width = w
          el.height = h
          setSize([w, h])
        }
        el.getContext('2d')!.drawImage(d, 0, 0)
        setPending(false)
        setError(undefined)
      },
      (e) => { if (live) setError((e as Error).message) },
    )
    return () => { live = false }
  }, [track, i, version])

  return (
    <figure className={cx('rp-frame', className)} data-pending={pending || undefined} {...rest}>
      <canvas ref={canvas} aria-label={`${name}, frame ${i}`} />
      <figcaption>
        <span>{name}</span>
        {error ? <span data-tone="error">{error}</span> : size && <span className="rp-mono">{size[0]}×{size[1]}{track.label ? ` · ${track.label}` : ''}</span>}
      </figcaption>
    </figure>
  )
}
