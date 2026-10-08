import { useMemo, useRef, useState, type ComponentPropsWithRef } from 'react'
import { vectorAt, type VectorTrack } from '@robopeek/rlds'
import { cx } from './cx.ts'

const W = 600
const H = 96
const SERIES = 8

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : Math.abs(v) >= 1000 || Math.abs(v) < 0.001 ? v.toExponential(2) : v.toFixed(3))

export type VectorChartProps = Omit<ComponentPropsWithRef<'section'>, 'children' | 'onSeek'> & {
  name: string
  track: VectorTrack
  length: number
  step: number
  onSeek: (step: number) => void
  /** Tracks wider than this (e.g. 512-d embeddings) start collapsed behind a "Chart all" button. */
  maxSeries?: number
}

/** One line per dimension over the episode; click or drag to scrub. Click a legend entry to hide a dim. */
export function VectorChart({ name, track, length, step, onSeek, maxSeries = 32, className, ...rest }: VectorChartProps) {
  const [expanded, setExpanded] = useState(false)
  const collapsed = track.dim > maxSeries && !expanded
  const range = useMemo(() => {
    let min = Infinity
    let max = -Infinity
    for (const v of track.data) {
      if (v < min) min = v
      if (v > max) max = v
    }
    return min === max ? ([min - 1, max + 1] as const) : ([min, max] as const)
  }, [track])
  return (
    <section className={cx('rp-chart', className)} data-collapsed={collapsed || undefined} {...rest}>
      <header>
        <h3>{name}</h3>
        <span className="rp-mono rp-dim">[{track.shape.join('×') || 1}] · {fmt(range[0])} … {fmt(range[1])}</span>
      </header>
      {collapsed ? (
        <p className="rp-chart-collapsed">
          <span className="rp-dim">{track.dim} values per step</span>
          <button type="button" className="rp-btn" onClick={() => setExpanded(true)}>Chart all</button>
        </p>
      ) : (
        <Plot track={track} length={length} step={step} onSeek={onSeek} range={range} />
      )}
    </section>
  )
}

type PlotProps = Pick<VectorChartProps, 'track' | 'length' | 'step' | 'onSeek'> & { range: readonly [number, number] }

function Plot({ track, length, step, onSeek, range: [min, max] }: PlotProps) {
  const svg = useRef<SVGSVGElement>(null)
  const [hidden, setHidden] = useState<Set<number>>(new Set())

  const paths = useMemo(() => {
    const x = (t: number) => (length > 1 ? (t / (length - 1)) * W : W / 2)
    const y = (v: number) => H - ((v - min) / (max - min)) * H
    return Array.from({ length: track.dim }, (_, d) => {
      let p = ''
      for (let t = 0; t < length; t++) p += `${t ? 'L' : 'M'}${x(t).toFixed(1)},${y(track.data[t * track.dim + d]).toFixed(1)}`
      return p
    })
  }, [track, length, min, max])

  const seekFrom = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect()
    onSeek(Math.round(((e.clientX - r.left) / r.width) * (length - 1)))
  }

  const cursor = length > 1 ? (step / (length - 1)) * W : W / 2
  const now = vectorAt(track, step)
  const zero = H - ((0 - min) / (max - min)) * H

  return (
    <>
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); seekFrom(e) }}
        onPointerMove={(e) => { if (e.buttons) seekFrom(e) }}
      >
        <line className="rp-chart-zero" x1={0} x2={W} y1={zero} y2={zero} />
        {paths.map((d, i) => !hidden.has(i) && <path key={i} d={d} style={{ stroke: `var(--rp-series-${i % SERIES})` }} />)}
        <line className="rp-chart-cursor" x1={cursor} x2={cursor} y1={0} y2={H} />
      </svg>
      <ul className="rp-chart-legend">
        {Array.from(now, (v, i) => (
          <li key={i}>
            <button
              type="button"
              className="rp-btn"
              data-off={hidden.has(i) || undefined}
              onClick={() => setHidden((h) => { const n = new Set(h); if (!n.delete(i)) n.add(i); return n })}
              title={hidden.has(i) ? 'Show dimension' : 'Hide dimension'}
            >
              <i style={{ background: `var(--rp-series-${i % SERIES})` }} />
              <span className="rp-dim">{i}</span>
              <span className="rp-mono">{fmt(v)}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
