import { useEffect, useMemo, useState } from 'react'
import { episodeTitle, formatFeature, vectorAt, type Episode, type ImageTrack, type Source, type VectorTrack } from '@videodb/robopeek-rlds'
import { useShard } from './useShard.ts'
import './custom.css'

// A complete custom viewer on @videodb/robopeek-rlds alone: a gallery of episodes, an <img> player,
// an SVG chart and a metadata table, all written here.
export function CustomViewer({ source }: { source: Source }) {
  const { episodes, progress, state, error } = useShard(source)
  const [selected, setSelected] = useState(0)
  const episode = episodes[selected]

  return (
    <div className="cv">
      <p className="cv-status" data-state={state}>
        {state === 'error' ? error : `${state === 'loading' ? 'Reading' : 'Read'} ${episodes.length} episodes · ${mb(progress.loaded)}${progress.total ? ` of ${mb(progress.total)}` : ''} MB`}
      </p>
      <div className="cv-body">
        <ol className="cv-gallery">
          {episodes.map((ep) => (
            <li key={ep.index}>
              <button aria-pressed={ep.index === selected} onClick={() => setSelected(ep.index)}>
                <Thumb track={firstEncoded(ep)} />
                <span className="cv-gallery-title">#{ep.index} {episodeTitle(ep) || 'Untitled'}</span>
                <span className="cv-gallery-sub">{ep.length} steps</span>
              </button>
            </li>
          ))}
        </ol>
        {episode ? <EpisodeDetail key={episode.index} episode={episode} /> : <p className="cv-empty">Waiting for the first episode…</p>}
      </div>
    </div>
  )
}

function EpisodeDetail({ episode }: { episode: Episode }) {
  const cameras = Object.entries(episode.images).filter((e): e is [string, Extract<ImageTrack, { kind: 'encoded' }>] => e[1].kind === 'encoded')
  const charts = Object.entries(episode.vectors).filter(([k, v]) => v.dim > 1 && v.dim <= 16 && !k.startsWith('is_'))
  const [camera, setCamera] = useState(0)
  const [chart, setChart] = useState(charts[0]?.[0])
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)

  // Our own clock: 10 steps per second, stops at the end.
  useEffect(() => {
    if (!playing) return
    if (step >= episode.length - 1) return setPlaying(false)
    const id = setTimeout(() => setStep(step + 1), 100)
    return () => clearTimeout(id)
  }, [playing, step, episode.length])
  const toggle = () => {
    if (!playing && step >= episode.length - 1) setStep(0)
    setPlaying(!playing)
  }

  const cam = cameras[camera]?.[1]
  const instruction = Object.values(episode.text).map((t) => t[step]).find(Boolean)
  return (
    <section className="cv-detail">
      <div className="cv-screen">
        {cam ? <Frame bytes={cam.frames[step]} mime={cam.mime} /> : <p>No encoded camera in this episode.</p>}
        {instruction && <p className="cv-caption">{instruction}</p>}
      </div>
      <div className="cv-controls">
        <button className="cv-play" onClick={toggle}>{playing ? 'Pause' : 'Play'}</button>
        <input type="range" min={0} max={episode.length - 1} value={step} onChange={(e) => setStep(Number(e.currentTarget.value))} aria-label="Step" />
        <span className="cv-step">{step + 1} / {episode.length}</span>
      </div>
      {cameras.length > 1 && (
        <div className="cv-pills">
          {cameras.map(([k], i) => <button key={k} aria-pressed={i === camera} onClick={() => setCamera(i)}>{k.replace('observation/', '')}</button>)}
        </div>
      )}
      {chart && (
        <div className="cv-panel">
          <select value={chart} onChange={(e) => setChart(e.currentTarget.value)}>
            {charts.map(([k, v]) => <option key={k} value={k}>{k} ({v.dim}-d)</option>)}
          </select>
          <LineChart track={episode.vectors[chart]} length={episode.length} step={step} onSeek={setStep} />
        </div>
      )}
      <table className="cv-table">
        <tbody>
          {Object.entries(episode.metadata).map(([k, f]) => <tr key={k}><th>{k}</th><td>{formatFeature(f)}</td></tr>)}
          <tr><th>tracks</th><td>{Object.keys(episode.vectors).join(', ')}</td></tr>
        </tbody>
      </table>
    </section>
  )
}

const COLORS = ['#2563eb', '#db2777', '#16a34a', '#ea580c', '#7c3aed', '#0891b2', '#ca8a04', '#64748b']

function LineChart({ track, length, step, onSeek }: { track: VectorTrack; length: number; step: number; onSeek: (s: number) => void }) {
  const paths = useMemo(() => {
    let lo = Infinity, hi = -Infinity
    for (const v of track.data) { if (v < lo) lo = v; if (v > hi) hi = v }
    const span = hi - lo || 1
    return Array.from({ length: track.dim }, (_, d) =>
      Array.from({ length }, (_, t) => `${t ? 'L' : 'M'}${((t / Math.max(1, length - 1)) * 100).toFixed(2)},${(40 - ((vectorAt(track, t)[d] - lo) / span) * 40).toFixed(2)}`).join(''),
    )
  }, [track, length])
  const x = (step / Math.max(1, length - 1)) * 100
  return (
    <svg
      className="cv-chart" viewBox="0 0 100 40" preserveAspectRatio="none"
      onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onSeek(Math.round(((e.clientX - r.left) / r.width) * (length - 1))) }}
    >
      {paths.map((p, d) => <path key={d} d={p} stroke={COLORS[d % COLORS.length]} />)}
      <line x1={x} x2={x} y1={0} y2={40} className="cv-playhead" />
    </svg>
  )
}

function Thumb({ track }: { track?: Extract<ImageTrack, { kind: 'encoded' }> }) {
  return track ? <Frame bytes={track.frames[0]} mime={track.mime} /> : <span className="cv-noimg" />
}

/** Encoded frames are PNG/JPEG/WebP bytes, so an <img> with a blob URL is enough. */
function Frame({ bytes, mime }: { bytes: Uint8Array; mime: string }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    const u = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }))
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [bytes, mime])
  return url ? <img src={url} alt="" /> : null
}

const firstEncoded = (ep: Episode) =>
  Object.values(ep.images).find((t): t is Extract<ImageTrack, { kind: 'encoded' }> => t.kind === 'encoded')
const mb = (n: number) => (n / 1e6).toFixed(1)
