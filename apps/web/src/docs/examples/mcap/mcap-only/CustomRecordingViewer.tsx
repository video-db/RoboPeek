import { useEffect, useMemo, useRef, useState } from 'react'
import { VideoTrackDecoder, decodePng16, indexAt, isPng16Gray, rawToRGBA, vectorAt, type Recording, type Source, type VectorTrack } from '@videodb/robopeek-mcap'
import { useMcap } from './useMcap.ts'
import '../../rlds-only/custom.css'
import './recording.css'

// A complete custom viewer on @videodb/robopeek-mcap alone: a topic table, a <canvas> player on our own clock,
// an SVG chart and a metadata table, all written here.
export function CustomRecordingViewer({ source }: { source: Source }) {
  const { recording, version, progress, state, error } = useMcap(source)
  const [camera, setCamera] = useState<string>()
  const cameras = recording ? Object.keys(recording.images) : []
  const selected = camera && cameras.includes(camera) ? camera : cameras[0]

  return (
    <div className="cv">
      <p className="cv-status" data-state={state}>
        {state === 'error' ? error : `${state === 'loading' ? 'Reading' : 'Read'} ${recording?.topics.size ?? 0} topics · ${mb(progress.loaded)}${progress.total ? ` of ${mb(progress.total)}` : ''} MB`}
      </p>
      <div className="cv-body">
        <ol className="cr-topics">
          {recording && [...recording.topics.values()].map((t) => (
            <li key={t.topic}>
              <button aria-pressed={t.topic === selected} disabled={!recording.images[t.topic]} onClick={() => setCamera(t.topic)}>
                <span className="cr-topic">{t.topic}</span>
                <span className="cr-sub">{t.kind ?? '…'} · {t.count.toLocaleString()} msgs · {t.schema}</span>
              </button>
            </li>
          ))}
        </ol>
        {recording && recording.origin !== undefined
          ? <RecordingDetail recording={recording} version={version} camera={selected} />
          : <p className="cv-empty">Waiting for the first messages…</p>}
      </div>
    </div>
  )
}

function RecordingDetail({ recording, version, camera }: { recording: Recording; version: number; camera?: string }) {
  const charts = Object.entries(recording.vectors).filter(([, v]) => v.dim > 1 && v.dim <= 16)
  const [chart, setChart] = useState<string>()
  const shown = chart ?? charts[0]?.[0]
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const end = recording.length

  // Our own clock: real time, 20 updates a second, stops at the end.
  useEffect(() => {
    if (!playing) return
    if (t >= end) return setPlaying(false)
    const id = setTimeout(() => setT(Math.min(end, t + 0.05)), 50)
    return () => clearTimeout(id)
  }, [playing, t, end])
  const toggle = () => {
    if (!playing && t >= end) setT(0)
    setPlaying(!playing)
  }

  const caption = Object.values(recording.text).map((tx) => tx.values[indexAt(tx.times, t)]).find(Boolean)
  return (
    <section className="cv-detail">
      <div className="cv-screen">
        {camera ? <CameraCanvas recording={recording} topic={camera} t={t} version={version} /> : <p>No camera topics in this file.</p>}
        {caption && <p className="cv-caption">{caption}</p>}
      </div>
      <div className="cv-controls">
        <button className="cv-play" onClick={toggle}>{playing ? 'Pause' : 'Play'}</button>
        <input type="range" min={0} max={end} step={0.01} value={t} onChange={(e) => setT(Number(e.currentTarget.value))} aria-label="Time" />
        <span className="cv-step">{t.toFixed(2)} / {end.toFixed(2)} s</span>
      </div>
      {shown && (
        <div className="cv-panel">
          <select value={shown} onChange={(e) => setChart(e.currentTarget.value)}>
            {charts.map(([k, v]) => <option key={k} value={k}>{k} ({v.dim}-d)</option>)}
          </select>
          <LineChart track={recording.vectors[shown]} end={end} t={t} onSeek={setT} />
        </div>
      )}
      <table className="cv-table">
        <tbody>
          {Object.entries(recording.metadata).map(([k, v]) => <tr key={k}><th>{k}</th><td>{v.length > 200 ? `${v.slice(0, 200)}…` : v}</td></tr>)}
          <tr><th>duration</th><td>{end.toFixed(2)} s</td></tr>
        </tbody>
      </table>
    </section>
  )
}

/** Draws the camera's frame at time t. JPEG/PNG via createImageBitmap, raw pixels via rawToRGBA, H.264 via WebCodecs. */
function CameraCanvas({ recording, topic, t, version }: { recording: Recording; topic: string; t: number; version: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const track = recording.images[topic]
  const i = indexAt(track.times, t)
  const decoder = useMemo(() => track.kind === 'video' && VideoTrackDecoder.supported()
    ? new VideoTrackDecoder({ format: track.format ?? '', get length() { return track.times.length }, keyframe: (j) => track.keys[j], data: (j) => recording.frame(topic, j)?.data })
    : undefined, [recording, topic, track])
  useEffect(() => () => decoder?.close(), [decoder])

  useEffect(() => {
    if (i < 0) return
    let cancelled = false
    ;(async () => {
      let f = recording.frame(topic, i) // undefined if released under the memory budget
      if (f?.kind === 'encoded' && isPng16Gray(f.data)) f = await decodePng16(f.data) // 16-bit depth, full range
      const image = track.kind === 'video' ? await decoder?.frameAt(i).catch(() => undefined)
        : f?.kind === 'encoded' ? await createImageBitmap(new Blob([f.data as BlobPart], { type: f.mime }))
        : f?.kind === 'raw' ? new ImageData(rawToRGBA(f), f.width, f.height)
        : undefined
      const canvas = ref.current
      if (cancelled || !image || !canvas) return
      const ctx = canvas.getContext('2d')!
      if (image instanceof ImageData) {
        canvas.width = image.width
        canvas.height = image.height
        ctx.putImageData(image, 0, 0)
        return
      }
      canvas.width = 'displayWidth' in image ? image.displayWidth : image.width
      canvas.height = 'displayHeight' in image ? image.displayHeight : image.height
      ctx.drawImage(image, 0, 0)
      if (image instanceof ImageBitmap) image.close() // the video decoder owns its frames
    })()
    return () => { cancelled = true }
  }, [recording, topic, i, decoder, track.kind, version])

  return <canvas ref={ref} className="cr-canvas" />
}

const COLORS = ['#2563eb', '#db2777', '#16a34a', '#ea580c', '#7c3aed', '#0891b2', '#ca8a04', '#64748b']

function LineChart({ track, end, t, onSeek }: { track: VectorTrack; end: number; t: number; onSeek: (t: number) => void }) {
  const n = track.times.length
  const paths = useMemo(() => {
    let lo = Infinity, hi = -Infinity
    for (const v of track.data) if (Number.isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v }
    const span = hi - lo || 1
    const x = (k: number) => ((track.times[k] / Math.max(1e-9, end)) * 100).toFixed(2)
    return Array.from({ length: track.dim }, (_, d) =>
      Array.from({ length: n }, (_, k) => `${k ? 'L' : 'M'}${x(k)},${(40 - ((vectorAt(track, k)[d] - lo) / span) * 40).toFixed(2)}`).join(''),
    )
  }, [track, n, end])
  const x = (t / Math.max(1e-9, end)) * 100
  return (
    <svg
      className="cv-chart" viewBox="0 0 100 40" preserveAspectRatio="none"
      onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onSeek(((e.clientX - r.left) / r.width) * end) }}
    >
      {paths.map((p, d) => <path key={d} d={p} stroke={COLORS[d % COLORS.length]} />)}
      <line x1={x} x2={x} y1={0} y2={40} className="cv-playhead" />
    </svg>
  )
}

const mb = (n: number) => (n / 1e6).toFixed(1)
