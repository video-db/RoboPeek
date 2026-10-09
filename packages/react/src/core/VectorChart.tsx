import { useMemo, useRef, useState, type ComponentPropsWithRef } from 'react'
import { indexAt, rowAt, type VectorTrack } from './timeline.ts'
import { cx } from './cx.ts'

const W = 600
const H = 96
const SERIES = 8

const fmt = (v: number) => (Number.isNaN(v) ? '–' : Number.isInteger(v) ? String(v) : Math.abs(v) >= 1000 || Math.abs(v) < 0.001 ? v.toExponential(2) : v.toFixed(3))

export type VectorChartProps = Omit<ComponentPropsWithRef<'section'>, 'children' | 'onSeek'> & {
  name: string
  track: VectorTrack
  /** Last position on the x axis (the timeline's `end`). */
  end: number
  position: number
  onSeek: (position: number) => void
  /** Timeline version; a change redraws a track that is still filling in. */
  version?: number
  /** Tracks wider than this (e.g. 512-d embeddings) start collapsed behind a "Chart all" button. */
  maxSeries?: number
}

/** One line per dimension; click or drag to seek. Click a legend entry to hide a dimension. */
export function VectorChart({ name, track, end, position, onSeek, version, maxSeries = 32, className, ...rest }: VectorChartProps) {
  const [expanded, setExpanded] = useState(false)
  const collapsed = track.dim > maxSeries && !expanded
  const range = useMemo(() => {
    let min = Infinity
    let max = -Infinity
    for (let k = 0; k < track.data.length; k++) {
      const v = track.data[k]
      if (v < min) min = v
      if (v > max) max = v
    }
    if (min > max) return [0, 1] as const
    return min === max ? ([min - 1, max + 1] as const) : ([min, max] as const)
  }, [track, version])
  return (
    <section className={cx('rp-chart', className)} data-collapsed={collapsed || undefined} {...rest}>
      <header>
        <h3>{name}</h3>
        <span className="rp-mono rp-dim">[{(track.shape ?? [track.dim]).join('×') || 1}] · {fmt(range[0])} … {fmt(range[1])}</span>
      </header>
      {collapsed ? (
        <p className="rp-chart-collapsed">
          <span className="rp-dim">{track.dim} values per sample</span>
          <button type="button" className="rp-btn" onClick={() => setExpanded(true)}>Chart all</button>
        </p>
      ) : (
        <Plot track={track} end={end} position={position} onSeek={onSeek} version={version} range={range} />
      )}
    </section>
  )
}

type PlotProps = Pick<VectorChartProps, 'track' | 'end' | 'position' | 'onSeek' | 'version'> & { range: readonly [number, number] }

// Long tracks (kHz joint states) are drawn as each pixel column's first, min and max, so a path stays ~W points.
function linePath(track: VectorTrack, d: number, x: (t: number) => number, y: (v: number) => number) {
  let p = ''
  let col = -1
  let lo = 0
  let hi = 0
  const flush = () => {
    if (col >= 0 && lo !== hi) p += `L${col},${y(lo).toFixed(1)}L${col},${y(hi).toFixed(1)}`
  }
  for (let i = 0; i < track.times.length; i++) {
    const v = track.data[i * track.dim + d]
    if (Number.isNaN(v)) continue
    const c = Math.round(x(track.times[i]))
    if (c !== col) {
      flush()
      p += `${p ? 'L' : 'M'}${c},${y(v).toFixed(1)}`
      col = c
      lo = hi = v
    } else {
      if (v < lo) lo = v
      if (v > hi) hi = v
    }
  }
  flush()
  return p
}

function Plot({ track, end, position, onSeek, version, range: [min, max] }: PlotProps) {
  const svg = useRef<SVGSVGElement>(null)
  const [hidden, setHidden] = useState<Set<number>>(new Set())
  const span = end > 0 ? end : 1

  const paths = useMemo(() => {
    const x = (t: number) => (end > 0 ? (t / span) * W : W / 2)
    const y = (v: number) => H - ((v - min) / (max - min)) * H
    return Array.from({ length: track.dim }, (_, d) => linePath(track, d, x, y))
  }, [track, end, span, min, max, version])

  const seekFrom = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect()
    onSeek(((e.clientX - r.left) / r.width) * span)
  }

  const cursor = end > 0 ? (position / span) * W : W / 2
  const i = indexAt(track.times, position)
  const now = i < 0 ? Array<number>(track.dim).fill(NaN) : rowAt(track, i)
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
        {paths.map((d, k) => !hidden.has(k) && <path key={k} d={d} style={{ stroke: `var(--rp-series-${k % SERIES})` }} />)}
        <line className="rp-chart-cursor" x1={cursor} x2={cursor} y1={0} y2={H} />
      </svg>
      <ul className="rp-chart-legend">
        {now.map((v, k) => (
          <li key={k}>
            <button
              type="button"
              className="rp-btn"
              data-off={hidden.has(k) || undefined}
              onClick={() => setHidden((h) => { const n = new Set(h); if (!n.delete(k)) n.add(k); return n })}
              title={hidden.has(k) ? 'Show dimension' : 'Hide dimension'}
            >
              <i style={{ background: `var(--rp-series-${k % SERIES})` }} />
              <span className="rp-dim">{track.names?.[k] ?? k}</span>
              <span className="rp-mono">{fmt(v)}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
